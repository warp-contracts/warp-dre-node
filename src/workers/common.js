const { publishToRedis, publishToAppSync } = require("./publish");
const { config } = require("../config");

module.exports = {
  publish: async (logger, contractTxId, state, sortKey, stateHash, sig) => {
    if (config.gwPubSubConfig.publishState) {
      await publishToRedis(logger, contractTxId, {
        contractTxId: contractTxId,
        sortKey: sortKey,
        state: state,
        node: config.nodeJwk.n,
        signature: sig,
        stateHash: stateHash
      });
      logger.debug("Published to Redis");
    }

    if (config.appSync.publishState) {
      await publishToAppSync(logger, contractTxId, sortKey, state, sig);
    }
  },

  checkStateSize: (state) => {
    const maxSize = config.workersConfig.maxStateSizeB;
    const stateSize = Buffer.byteLength(JSON.stringify(state));
    if (stateSize > maxSize) {
      throw new Error("[MaxStateSizeError] State too big");
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
