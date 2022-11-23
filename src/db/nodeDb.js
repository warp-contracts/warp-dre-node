const knex = require("knex");
const {signState} = require("../signature");
const {getNodeManifest} = require("../config");

module.exports = {
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

  createNodeDbTables: async (knex) => {
    const hasErrorsTable = await knex.schema.hasTable('errors');
    if (!hasErrorsTable) {
      await knex.schema.createTable('errors', function (t) {
        t.string('contract_tx_id').index();
        t.jsonb('evaluation_options');
        t.jsonb('sdk_config');
        t.string('job_id').index().unique();
        t.string('failure').notNullable();
        t.timestamp('timestamp').defaultTo(knex.fn.now());
      });
    }

    const hasBlacklistTable = await knex.schema.hasTable('black_list');
    if (!hasBlacklistTable) {
      await knex.schema.createTable('black_list', function (t) {
        t.string('contract_tx_id').index().unique();
        t.integer('failures');
      });
    }

    const hasStatesTable = await knex.schema.hasTable('states');
    if (!hasStatesTable) {
      await knex.schema.createTable('states', function (t) {
        t.string('contract_tx_id').index();
        t.jsonb('manifest').notNullable();
        t.string('bundle_tx_id');
        t.string('sort_key').index();
        t.string('signature').notNullable();
        t.string('state_hash').notNullable();
        t.timestamp('timestamp').defaultTo(knex.fn.now());
        t.jsonb('state').notNullable();
        t.jsonb('validity').notNullable();
        t.jsonb('error_messages').notNullable();
        t.unique(['contract_tx_id', 'sort_key'])
      });
    }
  },

  connect: async () => {
    const db = knex({
      client: 'better-sqlite3',
      connection: {
        filename: `sqlite/node.sqlite`
      },
      useNullAsDefault: true
    });

    await db.raw('PRAGMA journal_mode = WAL');

    return db;
  },

  connectEvents: async () => {
    return knex({
      client: 'better-sqlite3',
      connection: {
        filename: `sqlite/node-events.sqlite`
      },
      useNullAsDefault: true,
      pool: {
        afterCreate: (conn, cb) => {
          // https://github.com/knex/knex/issues/4971#issuecomment-1030701574
          conn.pragma('journal_mode = WAL');
          cb();
        }
      }
    });
  },

  connectState: () => {
    return knex({
      client: 'better-sqlite3',
      connection: {
        filename: `sqlite/node-state.sqlite`
      },
      useNullAsDefault: true,
      pool: {
        afterCreate: (conn, cb) => {
          conn.pragma('journal_mode = WAL');
          cb();
        }
      }
    });
  },

  insertFailure: async (nodeDb, failureInfo) => {
    await nodeDb('errors')
      .insert(failureInfo)
      .onConflict(['job_id'])
      .ignore();
  },

  insertState: async (nodeDb, contractTxId, readResult) => {
    const manifest = await getNodeManifest();
    const {sig, stateHash} = await signState(contractTxId, readResult.sortKey, readResult.cachedValue.state, manifest);

    const entry = {
      contract_tx_id: contractTxId,
      manifest,
      sort_key: readResult.sortKey,
      signature: sig,
      state_hash: stateHash,
      state: readResult.cachedValue.state,
      validity: readResult.cachedValue.validity,
      error_messages: readResult.cachedValue.errorMessages
    }

    await nodeDb('states')
      .insert(entry)
      .onConflict(['contract_tx_id', 'sort_key'])
      .ignore();

    return entry;
  },

  upsertBlacklist: async (nodeDb, contractTxId) => {
    await nodeDb
      .raw(
        `INSERT OR
         REPLACE
         INTO black_list
        VALUES (?,
                COALESCE(
                        (SELECT failures
                         FROM black_list
                         WHERE contract_tx_id = ?),
                        0) + 1);`, [contractTxId, contractTxId]);
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

  getLastState: async (nodeDb, contractTxId) => {
    const result = await nodeDb('states')
      .where({
        contract_tx_id: contractTxId
      })
      .first('*')
      .orderBy('sort_key', 'desc');

    return result;
  },

  getAllContracts: async (nodeDb) => {
    return nodeDb('states')
      .distinct('contract_tx_id')
      .pluck('contract_tx_id');
  },

  hasContract: async (nodeDb, contractTxId) => {
    return (await nodeDb('states')
      .where({
        contract_tx_id: contractTxId
      }).first()) != null;
  },

  events: {
    register: (nodeDb, contractTxId, message) => {
      insertEvent(nodeDb, 'REQUEST_REGISTER', contractTxId, message).finally(()=>{});
    },
    update: (nodeDb, contractTxId, message) => {
      insertEvent(nodeDb, 'REQUEST_UPDATE', contractTxId, message).finally(()=>{});
    },
    reject: (nodeDb, contractTxId, message) => {
      insertEvent(nodeDb, 'REJECT', contractTxId, message).finally(()=>{});
    },
    failure: (nodeDb, contractTxId, message) => {
      insertEvent(nodeDb, 'FAILURE', contractTxId, message).finally(()=>{});
    },
    evaluated: (nodeDb, contractTxId, message) => {
      insertEvent(nodeDb, 'EVALUATED', contractTxId, message).finally(()=>{});
    },
    blacklisted: (nodeDb, contractTxId, message) => {
      insertEvent(nodeDb, 'BLACKLISTED', contractTxId, message).finally(()=>{});
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
}

async function insertEvent(nodeDb, event, contractTxId, message) {
  nodeDb('events')
    .insert({
      'contract_tx_id': contractTxId,
      'event': event,
      'message': message
    }).catch(e => {
      console.error('Error while storing event', {event, contractTxId, message});
    });
}