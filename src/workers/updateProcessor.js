const warp = require('../warp');
const {LoggerFactory} = require("warp-contracts");
const {storeAndPublish} = require("./common");
const {getEvaluationOptions} = require("../config");

LoggerFactory.INST.logLevel('none');
LoggerFactory.INST.logLevel('info', 'interactionsProcessor');
LoggerFactory.INST.logLevel('none', 'DefaultStateEvaluator');
const logger = LoggerFactory.INST.create('interactionsProcessor');
LoggerFactory.INST.logLevel('debug', 'EvaluationProgressPlugin');

const evaluationOptions = getEvaluationOptions();

module.exports = async (job) => {
  const contractTxId = job.data.contractTxId;
  logger.info('Update Processor', contractTxId);
  const isTest = job.data.test;
  const interaction = job.data.interaction;
  const stateCache = warp.stateEvaluator.getCache();
  const lmdb = stateCache.storage();
  const contract = warp
    .contract(contractTxId)
    .setEvaluationOptions(evaluationOptions);

  let result = await lmdb.transaction(async () => {
    const lastCachedKey = (await warp.stateEvaluator.latestAvailableState(contractTxId))?.sortKey;
    if (lastCachedKey?.localeCompare(interaction.lastSortKey) === 0) {
      logger.debug('Safe to use latest interaction');
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
  storeAndPublish(logger, isTest, contractTxId, result).finally(() => {
  });
};