const { warp } = require('./warp');

module.exports.isTxIdValid = (txId) => {
  const validTxIdRegex = /[a-z0-9_-]{43}/i;
  return validTxIdRegex.test(txId);
};

module.exports.getContractState = async (contractId) => {
  const warpState = await warp.stateEvaluator.latestAvailableState(contractId);

  return { result, parsed };
};
