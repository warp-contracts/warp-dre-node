const { LoggerFactory } = require('warp-contracts');
const { upsertBalances, upsertState, lastSortKey } = require('../../db/aggDbUpdates');

LoggerFactory.INST.logLevel('none');
LoggerFactory.INST.logLevel('debug', 'listener');

const logger = LoggerFactory.INST.create('listener');

module.exports = {
  onNewState: async function (data, signed) {
    const { contractTxId, result } = data;
    const contractState = result.cachedValue.state;
    const lastSK = await lastSortKey(contractTxId);

    if (result.sortKey.localeCompare(lastSK)) {
      await upsertState(contractTxId, result.sortKey, contractState, null, signed.signature, null, signed.stateHash);
      await upsertBalances(contractTxId, result.sortKey, contractState);
    } else {
      logger.warn('Received state with older or equal sort key', {
        contract: contractTxId,
        received: result.sortKey,
        latest: lastSK
      });
    }
  }
};
