const { LoggerFactory } = require('warp-contracts');
const { config } = require('../config');
const { storeAndPublish, checkStateSize } = require('./common');

module.exports = async function (warp, contractId) {
  LoggerFactory.INST.logLevel('none');
  const logger = LoggerFactory.INST.create('pollGatewayWorker');
  LoggerFactory.INST.logLevel('info', 'pollGatewayWorker');
  LoggerFactory.INST.logLevel('debug', 'EvaluationProgressPlugin');
  LoggerFactory.INST.logLevel('debug', 'WarpGatewayInteractionsLoader');
  const contract = warp.contract(contractId).setEvaluationOptions(config.evaluationOptions);
  (function workerLoop() {
    setTimeout(async function () {
      logger.info(`Polling contract from gateway: ${contractId}.`);
      try {
        const result = await contract.readState("000001223770,0000000000000,6effd24608d85a06f0b1f27aee9a1cb9f3322778ab8c7c236b4f044427aca421");
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
