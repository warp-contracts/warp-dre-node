const warp = require('./warp');
const {LoggerFactory} = require("warp-contracts");
const {publish, initPubSub} = require("warp-contracts-pubsub");

LoggerFactory.INST.logLevel('none');
LoggerFactory.INST.logLevel('info', 'processor');
const logger = LoggerFactory.INST.create('processor');

initPubSub();

module.exports = async (job) => {
  const contractTxId = job.data.contractTxId;
  const allowUnsafeClient = job.data.allowUnsafeClient === true;
  logger.info('Evaluating', contractTxId);
  const result = await warp.contract(contractTxId)
    .setEvaluationOptions({
      useVM2: true,
      ignoreExceptions: true,
      maxCallDepth: 5,
      maxInteractionEvaluationTimeSeconds: 10,
      allowBigInt: true,
      allowUnsafeClient,
      internalWrites: true,
    })
    .readState();
  logger.info(`Evaluated ${contractTxId} @ ${result.sortKey}`);

  logger.info('Publishing to app sync');
  publish(contractTxId, JSON.stringify({sortKey: result.sortKey, state: result.cachedValue.state}), job.data.appSyncKey)
    .then(r => {
      logger.info(`Published ${contractTxId}`, r);
    }).catch(e => {
    logger.error('Error while publishing message', e);
  });

};