const { LoggerFactory } = require('warp-contracts');
const { uContract } = require('../constants');
const { config } = require('../config');
const { storeAndPublish, checkStateSize } = require('./common');

module.exports = async function polluj(warp) {
  LoggerFactory.INST.logLevel('none');
  const logger = LoggerFactory.INST.create('pollGatewayWorker');
  LoggerFactory.INST.logLevel('info', 'pollGatewayWorker');
  LoggerFactory.INST.logLevel('debug', 'EvaluationProgressPlugin');
  const contract = warp.contract(uContract).setEvaluationOptions(config.evaluationOptions);
  (function workerLoop() {
    setTimeout(async function () {
      logger.info(`Polling contract from gateway: ${uContract}.`);
      try {
        const result = await contract.readState();
        checkStateSize(result.cachedValue.state);
        storeAndPublish(logger, false, uContract, result).finally(() => {});
        logger.info(`Polling from gateway completed.`);
      } catch (e) {
        logger.error(e);
      }
      workerLoop();
    }, 10000);
  })();
};
