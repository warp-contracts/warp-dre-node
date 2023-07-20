const { config } = require('../config');
const { publish: appSyncPublish, initPubSub: initAppSyncPublish } = require('warp-contracts-pubsub');

initAppSyncPublish();

const Redis = require('ioredis');

const redisPublisher = new Redis({
  ...config.gwPubSubConfig,
  lazyConnect: false
});

module.exports = {
  publishToRedis: async (logger, contractTxId, resultToBePublished) => {
    try {
      redisPublisher.publish('states', JSON.stringify(resultToBePublished));
      logger.debug('Published to Redis', contractTxId);
    } catch (e) {
      logger.error('Error while publishing to Redis');
    }
  },
  publishToAppSync: async (logger, contractTxId, result, dbResult) => {
    logger.info('Publishing to appSync');
    appSyncPublish(
      `states/${contractTxId}`,
      JSON.stringify({
        sortKey: result.sortKey,
        state: result.cachedValue.state,
        signature: dbResult.signature
      }),
      config.appSync.key
    )
      .then(() => {
        logger.debug(`Published to appSync ${contractTxId}`);
      })
      .catch((e) => {
        logger.error('Error while publishing to AppSync', e);
      });
  }
};
