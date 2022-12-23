const warp = require('../warp');

module.exports = async (ctx) => {
  const contractId = ctx.query.id;
  const key = ctx.query.key;

  try {
    if (!isTxIdValid(contractId)) {
      throw new Error('Invalid tx format');
    }
    const result = await warp.contract(contractId).getStorageValue(key);
    ctx.body = { contractTxId: contractId, key: key, value: result };
    ctx.status = 200;
  } catch (e) {
    ctx.body = e.message;
    ctx.status = 500;
  }
};

// TODO: stop copy-pasting this :-)
function isTxIdValid(txId) {
  const validTxIdRegex = /[a-z0-9_-]{43}/i;
  return validTxIdRegex.test(txId);
}
