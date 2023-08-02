const warp = require('../warp');
const { LoggerFactory, genesisSortKey } = require('warp-contracts');
const { storeAndPublish } = require('./common');
const { config } = require('../config');

LoggerFactory.INST.logLevel('info');
LoggerFactory.INST.logLevel('info', 'contractsProcessor');
const logger = LoggerFactory.INST.create('contractsProcessor');
LoggerFactory.INST.logLevel('debug', 'EvaluationProgressPlugin');

module.exports = async (job) => {
  try {
    const contractTxId = job.data.contractTxId;
    logger.info('Register Processor', contractTxId);
    const isTest = job.data.test;

    const result = await warp.contract(contractTxId)
      .setEvaluationOptions(config.evaluationOptions)
      .readState(genesisSortKey);

    storeAndPublish(logger, isTest, contractTxId, result).finally(() => {});
  } catch (e) {
    logger.error('Exception in register processor', e);
    throw new Error(e);
  }
};
