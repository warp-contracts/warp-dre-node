const { LoggerFactory } = require('warp-contracts');

module.exports = async function (contractId, onMessage) {
  LoggerFactory.INST.logLevel('debug');
  const logger = LoggerFactory.INST.create('pollGatewayWorker');
  LoggerFactory.INST.logLevel('info', 'pollGatewayWorker');
  (function workerLoop() {
    setTimeout(async function () {
      logger.info(`Polling contract from gateway: ${contractId}.`);
      try {
        await onMessage({ contractTxId: contractId, interaction: {} });
        logger.info(`Polling from gateway completed.`);
      } catch (e) {
        logger.error(e);
      }
      workerLoop();
    }, 10000);
  })();
};
