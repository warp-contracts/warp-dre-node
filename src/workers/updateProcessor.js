const warp = require("../warp");
const { LoggerFactory, genesisSortKey } = require("warp-contracts");
const { checkStateSize } = require("./common");
const { config } = require("../config");

// LoggerFactory.INST.logLevel('none', 'DefaultStateEvaluator');
LoggerFactory.INST.logLevel("debug", "interactionsProcessor");
LoggerFactory.INST.logLevel("debug", "EvaluationProgressPlugin");
LoggerFactory.INST.logLevel("debug", "WarpGatewayInteractionsLoader");
LoggerFactory.INST.logLevel("debug", "ContractHandler");
LoggerFactory.INST.logLevel("debug", "HandlerBasedContract");
LoggerFactory.INST.logLevel("info", "DefaultStateEvaluator");
LoggerFactory.INST.logLevel("debug", "SqliteContractCache");
LoggerFactory.INST.logLevel("debug", "WarpGatewayContractDefinitionLoader");
LoggerFactory.INST.logLevel("debug", "SqliteContractCache");
const logger = LoggerFactory.INST.create("interactionsProcessor");

class CacheConsistencyError extends Error {
  constructor(message) {
    super(message);
    this.name = "CacheConsistencyError";
  }
}

module.exports = async (job) => {
  const { contractTxId, isTest, partition, signatureQueue } = job.data;

  logger.info("Update Processor", contractTxId);
  if (!partition || partition.length == 0) {
    throw new Error("Wrong partition - no interactions", contractTxId);
  }

  const firstInteraction = partition[0];
  const contract = warp.contract(contractTxId).setEvaluationOptions(config.evaluationOptions);
  const lastCachedKey = (await warp.stateEvaluator.latestAvailableState(contractTxId))?.sortKey;
  logger.info("Sort keys", {
    lastCachedKey,
    firstInteractionLastSortKey: firstInteraction.lastSortKey,
    firstInteractionSortKey: firstInteraction.sortKey
  });

  // state not cached (or cached at genesisSortKey - i.e. initial contract state),
  // but first interaction in partition has lastSortKey set (i.e. it is NOT the very first interaction with a contract)
  if ((!lastCachedKey || lastCachedKey == genesisSortKey) && firstInteraction.lastSortKey != null) {
    throw new CacheConsistencyError(`Inconsistent state for ${contractTxId} - first interaction in partition has lastSortKey != null - while there is no state cached.`);
  }

  // first interaction for contract (i.e. first interaction in partition has lastSortKey = null), but we have already state cached at sortKey > genesisSortKey
  /*
  if (lastCachedKey && lastCachedKey != genesisSortKey && firstInteraction.lastSortKey == null) {
    throw new CacheConsistencyError(`Inconsistent state for ${contractTxId} - first interaction in partition has lastSortKey = null - while there is already state cached at ${lastCachedKey}`);
  }

  // state cached at a sortKey > genesisSortKey and first interaction in partition has lastSortKey set - but lastSortKey is different from the last cached sort key
  if (lastCachedKey && lastCachedKey != genesisSortKey && firstInteraction.lastSortKey != lastCachedKey) {
    throw new CacheConsistencyError(`Inconsistent state for ${contractTxId} - state cached at a different sortKey then first interaction lastSortKey`);
  }*/
  let filteredPartition = partition;
  if (lastCachedKey && firstInteraction.sortKey.localeCompare(lastCachedKey) <= 0) {
    logger.info("First sort key lower than last cached key, removing interactions");
    filteredPartition = partition.filter(i => i.sortKey.localeCompare(lastCachedKey) > 0);
    logger.info("Partition size after filtering", filteredPartition.length);
  }

  if (!lastCachedKey) {
    await contract.readState(genesisSortKey);
  }

  if (filteredPartition.length > 0) {
    const interactions = filteredPartition.map(i => i.interaction);
    const result = await contract.readStateFor(lastCachedKey || genesisSortKey, interactions);

    logger.info(`Evaluated ${contractTxId} @ ${result.sortKey}`, contract.lastReadStateStats());

    checkStateSize(result.cachedValue.state);
    if (!isTest) {
      await signatureQueue.add("sign", { contractTxId, result, interactions });
    }
  } else {
    logger.info("Skipping empty partition");
  }
};
