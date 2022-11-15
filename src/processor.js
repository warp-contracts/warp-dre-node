const warp = require('./warp');
const {LoggerFactory} = require("warp-contracts");
const {publish: appSyncPublish, initPubSub: initAppSyncPublish} = require("warp-contracts-pubsub");
const Redis = require("ioredis");
const {readGwPubSubConfig} = require("./config");

LoggerFactory.INST.logLevel('none');
LoggerFactory.INST.logLevel('info', 'processor');
const logger = LoggerFactory.INST.create('processor');

initAppSyncPublish();

const connectionOptions = readGwPubSubConfig();

module.exports = async (job) => {
  const contractTxId = job.data.contractTxId;
  const allowUnsafeClient = job.data.allowUnsafeClient === true;
  const isTest = job.data.test;
  logger.info('Evaluating', contractTxId);
  const result = await warp.contract(contractTxId)
    .setEvaluationOptions({
      useVM2: true,
      ignoreExceptions: false,
      maxCallDepth: 5,
      maxInteractionEvaluationTimeSeconds: 10,
      allowBigInt: true,
      allowUnsafeClient,
      internalWrites: true,
    })
    .readState();
  logger.info(`Evaluated ${contractTxId} @ ${result.sortKey}`);

  if (!isTest) {
    logger.info('Publishing to app sync');
    appSyncPublish(contractTxId, JSON.stringify({
      sortKey: result.sortKey,
      state: result.cachedValue.state
    }), job.data.appSyncKey)
      .then(r => {
        logger.info(`Published ${contractTxId}`);
      }).catch(e => {
      logger.error('Error while publishing message', e);
    });

    logger.info('Publishing to aggregating node');
    const redisPublisher = new Redis(connectionOptions);
    redisPublisher.connect().then(() => {
      redisPublisher.publish('states', JSON.stringify({
          contractTxId: contractTxId,
          sortKey: result.sortKey,
          state: result.cachedValue.state
        }
      ));
    });
  }

};