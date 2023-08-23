const knex = require('knex');
const { signState } = require('../signature');
const { config } = require('../config');
const stateDbConfig = require('../../knexConfigStateDb');

let stateDb = null;

module.exports = {
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
  },

  connect: () => {
    if (stateDb == null) {
      stateDb = knex(stateDbConfig);
    }

    return stateDb;
  },


  insertFailure: async (nodeDb, failureInfo) => {
    await nodeDb('errors').insert(failureInfo).onConflict(['job_id']).ignore();
  },

  insertSyncLog: async(nodeDb, data) => {
    await nodeDb("sync_log").insert(data);
  },

  getLastSyncTimestamp: async(nodeDb) => {
    const result = await nodeDb.raw('SELECT max(end_timestamp) as "lastTimestamp" from sync_log');
    if (result && result.length) {
      return result[0].lastTimestamp;
    } else {
      return null;
    }
  },

  // TODO
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

};
