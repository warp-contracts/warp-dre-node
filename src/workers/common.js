const { insertState, connect } = require('../db/nodeDb');
const { publishToRedis, publishToAppSync } = require('./publish');
const { config } = require('../config');

module.exports = {
  storeAndPublish: async (logger, isTest, contractTxId, result) => {
    insertState(connect(), contractTxId, result)
      .then(async (dbResult) => {
        logger.info('State stored in sqlite', contractTxId);

        if (!isTest) {
          await publishToRedis(logger, contractTxId, {
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
  },

  // joins consecutive interactions from one contract into an array.
  // e.g. ('c1' - interaction with 'contract A, c2 - interaction with 'contract B', etc):
  // [c1, c1, c1, c2, c2, c3, c2, c2, c1, c3, c3]
  // => [[c1, c1, c1], [c2, c2], [c3], [c2, c2], [c1], [c3, c3]]
  partition: (allInteractions) => {
    const result = [];
    if (!allInteractions || !allInteractions.length) {
      return result;
    }

    let partition = [];

    for (let i = 0; i < allInteractions.length; i++) {
      const interaction = allInteractions[i];

      if (partition.length == 0) {
        partition.push(interaction);
        continue;
      }

      const lastGroupItem = partition[partition.length - 1];
      if (lastGroupItem.contractTxId == interaction.contractTxId) {
        partition.push(interaction);
      } else {
        result.push(partition);
        partition = [];
        partition.push(interaction);
      }
    }
    result.push(partition);

    return result;
  }
};
