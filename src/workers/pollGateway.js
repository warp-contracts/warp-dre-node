const { LoggerFactory } = require('warp-contracts');
const { config } = require('../config');
const { storeAndPublish, checkStateSize } = require('./common');

module.exports = async function (warp, contractId) {
  LoggerFactory.INST.logLevel('debug');
  const logger = LoggerFactory.INST.create('pollGatewayWorker');
  LoggerFactory.INST.logLevel('info', 'pollGatewayWorker');
  LoggerFactory.INST.logLevel('debug', 'EvaluationProgressPlugin');
  LoggerFactory.INST.logLevel('debug', 'WarpGatewayInteractionsLoader');
  const contract = warp.contract(contractId).setEvaluationOptions(config.evaluationOptions);
  (function workerLoop() {
    setTimeout(async function () {
      logger.info(`Polling contract from gateway: ${contractId}.`);
      try {
        const result = await contract.readState();
        checkStateSize(result.cachedValue.state);
        storeAndPublish(logger, false, contractId, result).finally(() => {});
        logger.info(`Polling from gateway completed.`);
      } catch (e) {
        logger.error(e);
      }
      workerLoop();
    }, 10000);
  })();
};
