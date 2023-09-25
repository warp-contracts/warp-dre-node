const { LoggerFactory } = require('warp-contracts');
const { publish } = require('./common');
const { signState } = require('../signature');
const { warp } = require('../warp');
const { upsertBalances } = require('../db/aggDbUpdates');
const { config } = require('../config');

LoggerFactory.INST.logLevel('debug', 'setStatePostProcessor');
LoggerFactory.INST.logLevel('debug', 'PgContractCache');
const logger = LoggerFactory.INST.create('setStatePostProcessor');

const isTestInstance = config.env === 'test';

module.exports = async (job) => {
  try {
    const { contractTxId, result, interactions, requiresPublish } = job.data;
    logger.info('PostEval Processor', contractTxId);

    await upsertBalances(contractTxId, result.sortKey, result.cachedValue.state);
    const signed = await sign(contractTxId, result.sortKey, result.cachedValue.state);
    if (requiresPublish && !isTestInstance) {
      await publish(logger, contractTxId, result.cachedValue.state, signed.stateHash, signed.sig);
    }

    if (requiresPublish && !isTestInstance && interactions && interactions.length > 0) {
      await publishInternalWritesContracts(interactions);
    }
  } catch (e) {
    throw new Error(e);
  }
};

async function publishInternalWritesContracts(interactions) {
  const iwTagsValues = new Set();
  interactions.forEach((i) => {
    const tags = i.tags;
    if (tags) {
      tags.forEach((t) => {
        if (t.name == 'Interact-Write') {
          iwTagsValues.add(t.value);
        }
      });
    }
  });

  for (const iwContract of iwTagsValues) {
    const interactWriteContractResult = await warp.stateEvaluator.latestAvailableState(iwContract);
    await sign(iwContract, interactWriteContractResult.sortKey, interactWriteContractResult.cachedValue.state);
  }
}

async function sign(contractTxId, sortKey, state) {
  const signed = await signState(contractTxId, sortKey, state);

  await warp.stateEvaluator.getCache().setSignature({ key: contractTxId, sortKey }, signed.stateHash, signed.sig);

  return signed;
}
