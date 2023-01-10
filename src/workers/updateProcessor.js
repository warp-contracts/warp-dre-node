const warp = require('../warp');
const { LoggerFactory } = require('warp-contracts');
const { storeAndPublish, checkStateSize } = require('./common');
const { config } = require('../config');

LoggerFactory.INST.logLevel('debug');
LoggerFactory.INST.logLevel('debug', 'interactionsProcessor');
LoggerFactory.INST.logLevel('debug', 'DefaultStateEvaluator');
const logger = LoggerFactory.INST.create('interactionsProcessor');
LoggerFactory.INST.logLevel('debug', 'EvaluationProgressPlugin');

module.exports = async (job) => {
  const { contractTxId, isTest, interaction } = job.data;

  // workaround for https://github.com/taskforcesh/bullmq/issues/1557
  try {
    logger.info('Update Processor', contractTxId);
    const stateCache = warp.stateEvaluator.getCache();
    const lmdb = stateCache.storage();
    const contract = warp.contract(contractTxId).setEvaluationOptions(config.evaluationOptions);

    let lastSortKey = null;

    let result = await lmdb.transaction(async () => {
      const lastCachedKey = (await warp.stateEvaluator.latestAvailableState(contractTxId))?.sortKey;
      if (lastCachedKey?.localeCompare(interaction.lastSortKey) === 0) {
        logger.debug('Safe to use latest interaction');
        lastSortKey = interaction.lastSortKey;
        return await contract.readStateFor([interaction]);
      } else {
        return null;
      }
    });

    if (result == null) {
      logger.debug('Not safe to use latest interaction, reading via Warp GW.');
      result = await contract.readState();
    }

    logger.info(`Evaluated ${contractTxId} @ ${result.sortKey}`, contract.lastReadStateStats());
    checkStateSize(result.cachedValue.state);
    storeAndPublish(logger, isTest, contractTxId, result).finally(() => { });
    return { lastSortKey };
  } catch (e) {
    logger.error('Exception in update processor', e);

    throw new Error(e);
  }
};
