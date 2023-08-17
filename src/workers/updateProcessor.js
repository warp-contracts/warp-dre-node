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
LoggerFactory.INST.logLevel('debug', "WarpGatewayContractDefinitionLoader");
LoggerFactory.INST.logLevel('debug', "SqliteContractCache");
const logger = LoggerFactory.INST.create('interactionsProcessor');

module.exports = async (job) => {
  const { contractTxId, isTest, partition } = job.data;

  // workaround for https://github.com/taskforcesh/bullmq/issues/1557
  try {
    logger.info('Update Processor', contractTxId);
    if (!partition || partition.length == 0) {
      throw new Error("Wrong partition - no interactions", contractTxId);
    }

    const firstInteraction = partition[0];
    const contract = warp.contract(contractTxId).setEvaluationOptions(config.evaluationOptions);
    const lastCachedKey = (await warp.stateEvaluator.latestAvailableState(contractTxId))?.sortKey;
    logger.info("Sort keys",{
      lastCachedKey,
      firstInteractionLastSortKey: firstInteraction.lastSortKey,
      firstInteractionSortKey: firstInteraction.sortKey
    });

    // state not cached (or cached at genesisSortKey - i.e. initial contract state),
    // but first interaction in partition has lastSortKey set (i.e. it is NOT the very first interaction with a contract)
    if ((!lastCachedKey || lastCachedKey == genesisSortKey) && firstInteraction.lastSortKey != null) {
      throw new Error(`Inconsistent state for ${contractTxId} - first interaction in partition has lastSortKey != null - while there is no state cached.`);
    }

    // first interaction for contract (i.e. first interaction in partition has lastSortKey = null), but we have already state cached at sortKey > genesisSortKey
    if (lastCachedKey && lastCachedKey != genesisSortKey && firstInteraction.lastSortKey == null) {
      throw new Error(`Inconsistent state for ${contractTxId} - first interaction in partition has lastSortKey = null - while there is already state cached at ${lastCachedKey}`);
    }

    // state cached at a sortKey > genesisSortKey and first interaction in partition has lastSortKey set - but lastSortKey is different from the last cached sort key
    if (lastCachedKey && lastCachedKey != genesisSortKey && firstInteraction.lastSortKey != lastCachedKey) {
      throw new Error(`Inconsistent state for ${contractTxId} - state cached at a different sortKey then first interaction lastSortKey`);
    }

    if (!lastCachedKey) {
      await contract.readState(genesisSortKey);
    }

    const interactions = partition.map(i => i.interaction);
    const result = await contract.readStateFor(lastCachedKey || genesisSortKey, interactions);

    logger.info(`Evaluated ${contractTxId} @ ${result.sortKey}`, contract.lastReadStateStats());
    checkStateSize(result.cachedValue.state);
    await storeAndPublish(logger, isTest, contractTxId, result);

    if (!isTest) {
      const iwTagsValues = new Set();
      interactions.forEach(i => {
        const tags = i.tags;
        if (tags) {
          tags.forEach(t => {
            if (t.name == "Interact-Write") {
              iwTagsValues.add(t.value);
            }
          });
        }
      });

      for (const iwContract of iwTagsValues) {
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
  } catch (e) {
    logger.error('Exception in update processor', e);

    /*if (e.name == KnownErrors.NetworkCommunicationError) {
      return;
    }*/
    throw new Error(`${contractTxId}|${partition[0].id}|${e}`);
  }
};
