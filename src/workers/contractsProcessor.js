const warp = require('../warp');
const {LoggerFactory, genesisSortKey, CacheKey, EvalStateResult, Benchmark} = require("warp-contracts");
const {storeAndPublish} = require("./common");

LoggerFactory.INST.logLevel('none');
LoggerFactory.INST.logLevel('info', 'contractsProcessor');
const logger = LoggerFactory.INST.create('contractsProcessor');


module.exports = async (job) => {
  const benchmark = Benchmark.measure();
  const contractTxId = job.data.contractTxId;
  const isTest = job.data.test;
  logger.info('Contracts Processor', contractTxId);

  const stateCache = warp.stateEvaluator.getCache();
  const lmdb = stateCache.storage();

  await lmdb.transaction(async () => {
    const lastCached = await stateCache.getLast(contractTxId)
    if (lastCached !== null) {
      return;
    }

    await stateCache.put(
      new CacheKey(contractTxId, genesisSortKey),
      new EvalStateResult(job.data.initialState, {}, {})
    );
  });

  logger.info(`Stored ${contractTxId}`)

  storeAndPublish(logger, isTest, contractTxId, {
    sortKey: genesisSortKey,
    cachedValue: {
      state: job.data.initialState,
      validity: {},
      errorMessages: {}
    }
  })
    .finally(() => {
    });
};