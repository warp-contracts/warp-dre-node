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
      redisPublisher.publish('states/u', JSON.stringify(resultToBePublished));
      logger.debug('Published to Redis', contractTxId);
    } catch (e) {
      logger.error('Error while publishing to Redis', e);
    }
  },
  publishToAppSync: async (logger, contractTxId, sortKey, state, sig) => {
    logger.info('Publishing to appSync');
    try {
      const streamName = config.appSync.stream || config.dreName;
      await appSyncPublish(
        `states/${streamName}/${contractTxId}`,
        JSON.stringify({
          sortKey: sortKey,
          state: state,
          signature: sig,
          dre: config.dreName
        }),
        config.appSync.key
      );
      logger.debug(`Published to appSync ${contractTxId}`);
    } catch(e) {
      logger.error("Error while publishing to AppSync", e);
    }
  }
};
