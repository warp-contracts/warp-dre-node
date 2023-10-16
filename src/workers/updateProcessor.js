const { warp } = require("../warp");
const { LoggerFactory } = require("warp-contracts");
const { checkStateSize } = require("./common");
const { config } = require("../config");
const { postEvalQueue } = require("../bullQueue");

LoggerFactory.INST.logLevel("debug", "updateProcessor");
LoggerFactory.INST.logLevel("info", "EvaluationProgressPlugin");
LoggerFactory.INST.logLevel("debug", "WarpGatewayInteractionsLoader");
LoggerFactory.INST.logLevel("debug", "ContractHandler");
LoggerFactory.INST.logLevel("debug", "HandlerBasedContract");
LoggerFactory.INST.logLevel("debug", "DefaultStateEvaluator");
LoggerFactory.INST.logLevel("debug", "SqliteContractCache");
LoggerFactory.INST.logLevel("debug", "WarpGatewayContractDefinitionLoader");
LoggerFactory.INST.logLevel("debug", "SqliteContractCache");
const logger = LoggerFactory.INST.create("updateProcessor");

module.exports = async (job) => {
  try {
    const { contractTxId, isTest, interaction } = job.data;

    logger.info("Update Processor", contractTxId);

    const contract = warp.contract(contractTxId).setEvaluationOptions(config.evaluationOptions);
    const lastCachedKey = (await warp.stateEvaluator.latestAvailableState(contractTxId))?.sortKey;
    logger.debug("SortKeys:", {
      lastCachedKey,
      sortKey: interaction.sortKey,
      lastSortKey: interaction.lastSortKey
    });

    let result;

    // note: this check will work properly with at most 1 update processor per given contract...
    if (lastCachedKey && lastCachedKey === interaction.lastSortKey) {
      result = await contract.readStateFor(lastCachedKey, [interaction]);
    } else {
      result = await contract.readState(interaction.sortKey);
    }

    logger.info(`Evaluated ${contractTxId} @ ${result.sortKey}`, contract.lastReadStateStats());

    checkStateSize(result.cachedValue.state);
    if (!isTest) {
      await postEvalQueue.add(
        "sign",
        { contractTxId, result, interactions: [interaction], requiresPublish: true },
        { priority: 1 }
      );
    }

  } catch (e) {
    logger.error(e);
    throw e;
  }
};
