const { LoggerFactory } = require('warp-contracts');
const { postEvalQueue } = require('../bullQueue');
const { drePool } = require('../db/nodeDb');

LoggerFactory.INST.logLevel('info', 'contractsProcessor');
const logger = LoggerFactory.INST.create('contractsProcessor');
LoggerFactory.INST.logLevel('debug', 'EvaluationProgressPlugin');

module.exports = async () => {
  try {
    logger.info('Maintenance Processor');

    const result = await drePool.query(`
        with last_txs as (select key, max(sort_key) as max_sk
                          from warp.sort_key_cache
                          group by key),
             last20_contracts as (select 1 as priority, sk.key, sk.value, sk.sort_key
                                  from last_txs lt
                                           join warp.sort_key_cache sk on sk.key = lt.key and sk.sort_key = lt.max_sk
                                  where sk.signature is null
                                  order by sk.sort_key
                                  limit 20),
             last20_all as (select 2 as priority, key, value, sort_key
                            from warp.sort_key_cache
                            where signature is null
                            order by sort_key desc
                            limit 20)
        SELECT *
        from last20_contracts
        union
        SELECT *
        from last20_all
        order by priority
        limit 20;
    `);

    if (result && result.rows && result.rows.length > 0) {
      for (const row of result.rows) {
        const contractTxId = row.key;
        const state = row.value;
        const sortKey = row.sort_key;
        await postEvalQueue.add('sign', {
          contractTxId,
          result: { sortKey, cachedValue: { state } },
          requiresPublish: false
        });
      }
    }
  } catch (e) {
    logger.error('Exception in register processor', e);
    throw new Error(e);
  }
};
