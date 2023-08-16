const warp = require('../warp');
const { LoggerFactory, genesisSortKey } = require('warp-contracts');
const { storeAndPublish, checkStateSize } = require('./common');
const { config } = require('../config');
const { publishToRedis, publishToAppSync } = require('../workers/publish');

// LoggerFactory.INST.logLevel('none', 'DefaultStateEvaluator');
LoggerFactory.INST.logLevel('debug', 'interactionsProcessor');
LoggerFactory.INST.logLevel('debug', "EvaluationProgressPlugin");
LoggerFactory.INST.logLevel('debug', "WarpGatewayInteractionsLoader");
LoggerFactory.INST.logLevel('debug', "ContractHandler");
LoggerFactory.INST.logLevel('debug', "HandlerBasedContract");
LoggerFactory.INST.logLevel('info', "DefaultStateEvaluator");
LoggerFactory.INST.logLevel('debug', "SqliteContractCache");
const logger = LoggerFactory.INST.create('interactionsProcessor');

module.exports = async (job) => {
  const { contractTxId, isTest, interaction } = job.data;

  // workaround for https://github.com/taskforcesh/bullmq/issues/1557
  try {
    logger.info('Update Processor', contractTxId);

    const contract = warp.contract(contractTxId).setEvaluationOptions(config.evaluationOptions);

    let lastSortKey = null;
    const lastCachedKey = (await warp.stateEvaluator.latestAvailableState(contractTxId))?.sortKey;
    logger.info("Last cached key", lastCachedKey);
    if (lastCachedKey && lastCachedKey.localeCompare(interaction.sortKey) >= 0) {
      throw new Error(`State already cached at ${lastCachedKey} >= ${interaction.sortKey}`);
    }
    if (!lastCachedKey) {
      logger.info("Initial contract read");
      await contract.readState(genesisSortKey);
    }

    const result = await contract.readStateFor(lastCachedKey || genesisSortKey, [interaction]);

    logger.info(`Evaluated ${contractTxId} @ ${result.sortKey}`, contract.lastReadStateStats());
    checkStateSize(result.cachedValue.state);
    await storeAndPublish(logger, isTest, contractTxId, result);

    if (!isTest) {
      const tags = interaction.tags;
      if (tags) {
        const interactWritesTags = tags.filter((t) => t.name == 'Interact-Write');
        if (interactWritesTags) {
          const interactWritesContracts = interactWritesTags.map((t) => t.value);
          for (const iwContract of interactWritesContracts) {
            const interactWriteContractResult = await warp.stateEvaluator.latestAvailableState(iwContract);

            logger.debug("Publishing to agg node for IW contract", iwContract);
            await publishToRedis(logger, iwContract, {
              contractTxId: iwContract,
              sortKey: interactWriteContractResult.sortKey,
              state: interactWriteContractResult.cachedValue.state,
              node: null,
              signature: null,
              manifest: null,
              stateHash: null
            });

            publishToAppSync(logger, iwContract, interactWriteContractResult, {
              signature: null
            });
          }
        }
      }
    }

    return { lastSortKey };
  } catch (e) {
    logger.error('Exception in update processor', e);

    /*if (e.name == KnownErrors.NetworkCommunicationError) {
      return;
    }*/
    throw new Error(`${contractTxId}|${interaction.id}|${e}`);
  }
};
