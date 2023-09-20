const { warp } = require('../warp');
const { LoggerFactory, genesisSortKey } = require('warp-contracts');
const { publish, checkStateSize } = require('./common');
const { config } = require('../config');
const { signState } = require('../signature');

LoggerFactory.INST.logLevel('info', 'contractsProcessor');
const logger = LoggerFactory.INST.create('contractsProcessor');
LoggerFactory.INST.logLevel('debug', 'EvaluationProgressPlugin');

module.exports = async (job) => {
  try {
    const contractTxId = job.data.contractTxId;
    logger.info('Register Processor', contractTxId);

    const result = await warp
      .contract(contractTxId)
      .setEvaluationOptions(config.evaluationOptions)
      .readState(genesisSortKey);

    checkStateSize(result.cachedValue.state);

    const { sig, stateHash } = await signState(contractTxId, result.sortKey, result.cachedValue.state);

    await warp.stateEvaluator.getCache().setSignature({ key: contractTxId, sortKey: result.sortKey }, stateHash, sig);
    if (job.data.publishContract) {
      await publish(logger, contractTxId, result.cachedValue.state, stateHash, sig);
    }
  } catch (e) {
    logger.error('Exception in register processor', e);
    throw new Error(e);
  }
};
