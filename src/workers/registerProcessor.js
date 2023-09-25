const { warp } = require('../warp');
const { LoggerFactory, genesisSortKey } = require('warp-contracts');
const { checkStateSize } = require('./common');
const { config } = require('../config');
const { postEvalQueue } = require('../bullQueue');

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

    await postEvalQueue.add('sign', { contractTxId, result, publish: job.data.publish });
  } catch (e) {
    logger.error('Exception in register processor', e);
    throw new Error(e);
  }
};
