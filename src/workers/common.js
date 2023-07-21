const { insertState, connect } = require('../db/nodeDb');
const { publishToRedis, publishToAppSync } = require('./publish');
const { config } = require('../config');

module.exports = {
  storeAndPublish: async (logger, isTest, contractTxId, result) => {
    insertState(connect(), contractTxId, result)
      .then((dbResult) => {
        logger.info('State stored in sqlite', contractTxId);

        if (!isTest) {
          publishToRedis(logger, contractTxId, {
            contractTxId: dbResult.contract_tx_id,
            sortKey: dbResult.sort_key,
            state: dbResult.state,
            node: dbResult.manifest.walletAddress,
            signature: dbResult.signature,
            manifest: dbResult.manifest,
            stateHash: dbResult.state_hash
          });

          if (config.appSync.publishState) {
            publishToAppSync(logger, contractTxId, result, dbResult);
          }
        }
      })
      .catch((e) => {
        logger.error('Error while storing in sqlite', e);
      });
  },
  checkStateSize: (state) => {
    const maxSize = config.workersConfig.maxStateSizeB;
    const stateSize = Buffer.byteLength(JSON.stringify(state));
    if (stateSize > maxSize) {
      throw new Error('[MaxStateSizeError] State too big');
    }
  }
};
