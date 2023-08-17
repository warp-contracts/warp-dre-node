const knex = require('knex');
const { signState } = require('../signature');
const { config } = require('../config');
const logger = require('../logger')('node-db');
const eventsDbConfig = require('../../knexConfigEventsDb');
const stateDbConfig = require('../../knexConfigStateDb');

let eventsDb = null;
let stateDb = null;

module.exports = {
  // remove
  createNodeDbEventsTables: async (knex) => {
    const hasEventsTable = await knex.schema.hasTable('events');
    if (!hasEventsTable) {
      await knex.schema.createTable('events', function (t) {
        t.string('contract_tx_id').notNullable().index();
        t.string('event').notNullable().index();
        t.timestamp('timestamp').defaultTo(knex.fn.now()).index();
        t.string('message');
      });
    }
  },

  // remove
  createNodeDbTables: async (knex) => {
    const hasErrorsTable = await knex.schema.hasTable('errors');
    if (!hasErrorsTable) {
      await knex.schema.createTable('errors', function (t) {
        t.string('contract_tx_id').index();
        t.jsonb('evaluation_options');
        t.jsonb('sdk_config');
        t.string('job_id').unique();
        t.string('failure').notNullable();
        t.timestamp('timestamp').defaultTo(knex.fn.now());
      });
    }


    const hasBlacklistTable = await knex.schema.hasTable('black_list');
    if (!hasBlacklistTable) {
      await knex.schema.createTable('black_list', function (t) {
        t.string('contract_tx_id').unique();
        t.integer('failures');
      });
    }

    const hasStatesTable = await knex.schema.hasTable('states');
    if (!hasStatesTable) {
      await knex.schema.createTable('states', function (t) {
        t.string('contract_tx_id').unique();
        t.jsonb('manifest').notNullable();
        t.string('bundle_tx_id');
        t.string('sort_key');
        t.string('signature').notNullable();
        t.string('state_hash').notNullable();
        t.timestamp('timestamp').defaultTo(knex.fn.now());
        t.jsonb('state').notNullable();
        t.jsonb('validity').notNullable();
        t.jsonb('error_messages').notNullable();
        t.unique(['contract_tx_id', 'sort_key']);
      });
    }


    const hasViewStateTable = await knex.schema.hasTable('view_state');
    if (!hasViewStateTable) {
      await knex.schema.createTable('view_state', function (t) {
        t.string('contract_tx_id').index();
        t.string('sort_key');
        t.string('caller').notNullable();
        t.string('signature').notNullable();
        t.string('view_hash').notNullable();
        t.jsonb('input').notNullable();
        t.jsonb('result').notNullable();
        t.unique(['contract_tx_id', 'input', 'caller']);
      });
    }

    const hasSyncLogTable = await knex.schema.hasTable('sync_log');
    if (!hasSyncLogTable) {
      await knex.schema.createTable('sync_log', function (t) {
        t.integer('start_timestamp').notNullable();
        t.integer('end_timestamp').index().notNullable();
        t.integer('response_length').notNullable();
        t.string('response_hash').notNullable();
        t.string('response_first_sortkey');
        t.string('response_last_sortkey');
        t.jsonb('errors');
      });
    }

    // Trigger for ensuring only the newest state is stored
    await knex.raw(`
    CREATE TRIGGER IF NOT EXISTS reject_outdated_state
    BEFORE UPDATE
      ON states
    BEGIN
      SELECT CASE
      WHEN (EXISTS (SELECT 1 FROM states WHERE states.contract_tx_id = NEW.contract_tx_id AND states.sort_key > NEW.sort_key))
      THEN RAISE(ABORT, 'Outdated sort_key')
      END;
    END;`);
  },

  connect: () => {
    if (stateDb == null) {
      stateDb = knex(stateDbConfig);
    }

    return stateDb;
  },

  connectEvents: () => {
    if (eventsDb == null) {
      eventsDb = knex(eventsDbConfig);
    }

    return eventsDb;
  },

  insertFailure: async (nodeDb, failureInfo) => {
    await nodeDb('errors').insert(failureInfo).onConflict(['job_id']).ignore();
  },

  insertSyncLog: async(nodeDb, data) => {
    await nodeDb("sync_log").insert(data);
  },

  lastSyncTimestamp: async(nodeDb) => {
    const result = await nodeDb.raw('SELECT max(end_timestamp) as "lastTimestamp" from sync_log');
    if (result && result.length) {
      return result[0].lastTimestamp;
    } else {
      return null;
    }
  },

  insertState: async (nodeDb, contractTxId, readResult) => {
    const manifest = await config.nodeManifest;
    const { sig, stateHash, validityHash } = await signState(
      contractTxId,
      readResult.sortKey,
      readResult.cachedValue.state,
      manifest,
      readResult.cachedValue.validity
    );

    const entry = {
      contract_tx_id: contractTxId,
      manifest: manifest,
      sort_key: readResult.sortKey,
      signature: sig,
      state_hash: stateHash,
      state: readResult.cachedValue.state,
      validity: readResult.cachedValue.validity,
      error_messages: readResult.cachedValue.errorMessages,
      validity_hash: validityHash
    };

    try {
      await nodeDb('states').insert(entry).onConflict(['contract_tx_id']).merge();
    } catch (e) {
      if (e && e.code) {
        throw new Error(`SqliteError ${contractTxId}@${readResult.sortKey}: ${e.code}`);
      } else {
        throw new Error(`Unknown error ${contractTxId}@${readResult.sortKey}`);
      }
    }

    return entry;
  },

  deleteStates: async (nodeDb, contractTxId) => {
    await nodeDb.raw(`DELETE FROM states WHERE contract_tx_id = ?;`, [contractTxId]);
  },

  upsertBlacklist: async (nodeDb, contractTxId) => {
    await nodeDb.raw(
      `INSERT OR
         REPLACE
         INTO black_list
        VALUES (?,
                COALESCE(
                        (SELECT failures
                         FROM black_list
                         WHERE contract_tx_id = ?),
                        0) + 1);`,
      [contractTxId, contractTxId]
    );
  },

  deleteBlacklist: async (nodeDb, contractTxId) => {
    await nodeDb.raw(`DELETE FROM black_list WHERE contract_tx_id = ?;`, [contractTxId]);
  },

  doBlacklist: async (nodeDb, contractTxId, failures) => {
    await nodeDb.raw(
      `INSERT OR
         REPLACE
         INTO black_list
        VALUES (?, ?)`,
      [contractTxId, failures]
    );
  },

  getFailures: async (nodeDb, contractTxId) => {
    const result = await nodeDb('black_list')
      .where({
        contract_tx_id: contractTxId
      })
      .first('failures');

    return result?.failures;
  },

  getAllBlacklisted: async (nodeDb) => {
    return nodeDb('black_list').select('contract_tx_id', 'failures');
  },

  getAllErrors: async (nodeDb) => {
    return nodeDb('errors').select('*');
  },

  getContractErrors: async (nodeDb, contractTxId) => {
    return nodeDb('errors')
      .where({
        contract_tx_id: contractTxId
      })
      .select('*')
      .orderBy('timestamp', 'desc');
  },

  deleteErrors: async (nodeDb, contractTxId) => {
    await nodeDb.raw(`DELETE FROM errors WHERE contract_tx_id = ?;`, [contractTxId]);
  },

  deleteEvents: async (contractTxId) => {
    await eventsDb.raw('DELETE FROM events WHERE contract_tx_id = ?;', [contractTxId]);
  },

  getLastStateFromDreCache: async (nodeDb, contractTxId) => {
    const result = await nodeDb('states')
      .where({
        contract_tx_id: contractTxId
      })
      .first('*')
      .orderBy('sort_key', 'desc');

    return result;
  },

  getSyncLog: async (nodeDb, start, end) => {
    const result = await nodeDb('sync_log')
      .where({
        start_timestamp: start,
        end_timestamp: end
      })
      .first('*');

    return result;
  },

  getCachedViewState: async (nodeDb, contractTxId, sortKey, input, caller) => {
    caller = caller || '';
    const result = await nodeDb.raw(
      `SELECT * FROM view_state WHERE contract_tx_id = ? AND sort_key = ? AND input = ? AND caller = ?;`,
      [contractTxId, sortKey, input, caller]
    );
    return result;
  },

  insertViewStateIntoCache: async (nodeDb, contractTxId, sortKey, input, result, caller) => {
    caller = caller || '';
    const manifest = await config.nodeManifest;
    const { sig, stateHash } = await signState(contractTxId, sortKey, result, caller, manifest);

    const entry = {
      contract_tx_id: contractTxId,
      sort_key: sortKey,
      input: input,
      caller: caller,
      signature: sig,
      view_hash: stateHash,
      result: result
    };

    await nodeDb('view_state').insert(entry).onConflict(['contract_tx_id', 'input', 'caller']).merge();

    return entry;
  },

  getAllContracts: async (nodeDb) => {
    return nodeDb('states').distinct('contract_tx_id').pluck('contract_tx_id');
  },

  hasContract: async (nodeDb, contractTxId) => {
    return (
      (await nodeDb('states')
        .where({
          contract_tx_id: contractTxId
        })
        .first()) != null
    );
  },

  events: {
    register: (nodeDb, contractTxId, message) => {
      insertEvent(nodeDb, 'REQUEST_REGISTER', contractTxId, message).finally(() => {});
    },
    update: (nodeDb, contractTxId, message) => {
      insertEvent(nodeDb, 'REQUEST_UPDATE', contractTxId, message).finally(() => {});
    },
    reject: (nodeDb, contractTxId, message) => {
      insertEvent(nodeDb, 'REJECT', contractTxId, message).finally(() => {});
    },
    failure: (nodeDb, contractTxId, message) => {
      insertEvent(nodeDb, 'FAILURE', contractTxId, message).finally(() => {});
    },
    updated: (nodeDb, contractTxId, message) => {
      insertEvent(nodeDb, 'UPDATED', contractTxId, message).finally(() => {});
    },
    evaluated: (nodeDb, contractTxId, message) => {
      insertEvent(nodeDb, 'EVALUATED', contractTxId, message).finally(() => {});
    },
    blacklisted: (nodeDb, contractTxId, message) => {
      insertEvent(nodeDb, 'BLACKLISTED', contractTxId, message).finally(() => {});
    },
    progress: (contractTxId, message) => {
      insertEvent(module.exports.connectEvents(), 'PROGRESS', contractTxId, message).finally(() => {});
    },
    loadForContract: async (nodeDb, contractTxId) => {
      return nodeDb('events')
        .where({
          contract_tx_id: contractTxId
        })
        .select('*')
        .orderBy('timestamp', 'desc');
    }
  }
};

async function insertEvent(nodeDb, event, contractTxId, message) {
  nodeDb('events')
    .insert({
      contract_tx_id: contractTxId,
      event: event,
      message: message
    })
    .catch(() => {
      logger.error('Error while storing event', { event, contractTxId, message });
    });
}
