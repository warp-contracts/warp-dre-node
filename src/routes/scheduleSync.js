const { warp } = require('../warp');
const { config } = require('../config');
const updates = new Map();

const chillOutTimeSeconds = 10;

module.exports = async (ctx) => {
  const contractTxId = ctx.query.id;
  try {
    if (!isTxIdValid(contractTxId)) {
      throw new Error('Invalid tx id format');
    }
    const now = new Date();
    if (updates.has(contractTxId) && (now - updates.get(contractTxId)) / 1000 < chillOutTimeSeconds) {
      throw new Error(`Chill out and wait ${chillOutTimeSeconds}s`);
    }

    const contract = warp.contract(contractTxId).connect(config.nodeJwk);
    const functionName = `__update_dre_${Date.now()}`;
    await contract.writeInteraction({ function: functionName });

    ctx.body = `Scheduled for update ${contractTxId}: ${functionName}`;
    ctx.status = 200;
  } catch (e) {
    ctx.body = e.message;
    ctx.status = 500;
  }
};

function isTxIdValid(txId) {
  const validTxIdRegex = /[a-z0-9_-]{43}/i;
  return validTxIdRegex.test(txId);
}
