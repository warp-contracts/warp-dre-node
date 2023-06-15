module.exports.isTxIdValid = (txId) => {
  const validTxIdRegex = /[a-z0-9_-]{43}/i;
  return validTxIdRegex.test(txId);
};
