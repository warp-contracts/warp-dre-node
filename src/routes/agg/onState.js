const { LoggerFactory } = require('warp-contracts');
const { upsertBalances, balancesLastSortKey } = require('../../db/aggDbUpdates');

LoggerFactory.INST.logLevel('none');
LoggerFactory.INST.logLevel('debug', 'listener');

const logger = LoggerFactory.INST.create('listener');

module.exports = {
  onNewState: async function (data) {
    const { contractTxId, result } = data;
    const contractState = result.cachedValue.state;
    const lastSK = await balancesLastSortKey(contractTxId);

    if (result.sortKey.localeCompare(lastSK)) {
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
