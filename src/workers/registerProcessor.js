const warp = require('../warp');
const { LoggerFactory, genesisSortKey, CacheKey, EvalStateResult } = require('warp-contracts');
const { storeAndPublish, checkStateSize } = require('./common');
const { config } = require('../config');

LoggerFactory.INST.logLevel('debug');
LoggerFactory.INST.logLevel('debug', 'contractsProcessor');
const logger = LoggerFactory.INST.create('contractsProcessor');
LoggerFactory.INST.logLevel('debug', 'EvaluationProgressPlugin');

module.exports = async (job) => {
  // workaround for https://github.com/taskforcesh/bullmq/issues/1557
  try {
    const contractTxId = job.data.contractTxId;
    logger.info('Register Processor', contractTxId);
    const isTest = job.data.test;
    logger.info('1', contractTxId);

    const stateCache = warp.stateEvaluator.getCache();
    logger.info('2', contractTxId);

    let result;
    if (job.data.force) {
      logger.info('3', contractTxId);
      result = await warp.contract(contractTxId).setEvaluationOptions(config.evaluationOptions).readState();
      logger.info('4', contractTxId);
      checkStateSize(result.cachedValue.state);
      logger.info('5', contractTxId);
    } else {
      logger.info('6', contractTxId);
      checkStateSize(job.data.initialState);
      logger.info('7', contractTxId);
      await stateCache.put(
        new CacheKey(contractTxId, genesisSortKey),
        new EvalStateResult(job.data.initialState, {}, {})
      );
      logger.info('8', contractTxId);
      result = {
        sortKey: genesisSortKey,
        cachedValue: {
          state: job.data.initialState,
          validity: {},
          errorMessages: {}
        }
      };
    }
    logger.info('9', contractTxId);
    storeAndPublish(logger, isTest, contractTxId, result).finally(() => {});
  } catch (e) {
    logger.error('Exception in update processor', e);
    throw new Error(e);
  }
};
