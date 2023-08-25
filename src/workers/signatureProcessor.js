const { LoggerFactory } = require("warp-contracts");
const { publish } = require("./common");
const { signState } = require("../signature");
const { warp }  = require("../warp");

LoggerFactory.INST.logLevel("debug", "signatureProcessor");
LoggerFactory.INST.logLevel("debug", "PgContractCache");
const logger = LoggerFactory.INST.create("signatureProcessor");

module.exports = async (job) => {
  try {
    const { contractTxId, result, interactions } = job.data;
    logger.info("Signature Processor", contractTxId);

    await signAndPublish(
      contractTxId,
      result.sortKey,
      result.cachedValue.state);

    await publishInternalWritesContracts(interactions);
  } catch (e) {
    throw new Error(e);
  }
};


async function publishInternalWritesContracts(interactions) {
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

    await signAndPublish(
      iwContract,
      interactWriteContractResult.sortKey,
      interactWriteContractResult.cachedValue.state);
  }
}

async function signAndPublish(contractTxId, sortKey, state) {
  const { sig, stateHash } = await signState(
    contractTxId,
    sortKey,
    state
  );

  await warp.stateEvaluator.getCache().setSignature({ key: contractTxId, sortKey }, stateHash, sig);

  await publish(logger, contractTxId, state, stateHash, sig);
}
