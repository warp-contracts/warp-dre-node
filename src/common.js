const { getLastStateFromDreCache, insertState } = require('./db/nodeDb');
const warp = require('./warp');

module.exports.isTxIdValid = (txId) => {
  const validTxIdRegex = /[a-z0-9_-]{43}/i;
  return validTxIdRegex.test(txId);
};

module.exports.getContractState = async (contractId, nodeDb) => {
  const warpState = await warp.stateEvaluator.latestAvailableState(contractId);
  let result = await getLastStateFromDreCache(nodeDb, contractId);
  let parsed = false;
  if (warpState && (!result || result.sort_key.localeCompare(warpState.sortKey) < 0)) {
    result = await insertState(nodeDb, contractId, warpState);
    parsed = true;
  }

  return { result, parsed };
};
