const warp = require('../warp');
const Arweave = require('arweave');
const fs = require('fs');
const ArweaveUtils = require('arweave/node/lib/utils');
const { deleteStates, deleteBlacklist, deleteErrors, deleteEvents, deleteWarpContractCache } = require('../db/nodeDb');
const { config } = require('../config');
const { isTxIdValid } = require('../common');

module.exports = async (ctx) => {
  const { nodeDb, nodeDbWarpState } = ctx;
  const contractId = ctx.params.id;
  const signature = ctx.query.signature;

  /* Pruning contract state from a specified sortKey is only valid for
   * - non kvStorage contracts
   * - sqlite based contract cache
   *  */
  const sortKey = ctx.query.sortKey;

  try {
    if (!contractId) {
      ctx.throw(422, 'Missing contract id.');
    }
    if (!isTxIdValid(contractId)) {
      ctx.throw(400, 'Invalid tx format');
    }
    if (!signature) {
      ctx.throw(422, 'Missing signature');
    }
    if (!(await isSigned(contractId, signature))) {
      ctx.throw(400, 'Invalid tx signature');
    }

    let result = null;
    if (sortKey) {
      result = await deleteWarpContractCache(nodeDbWarpState, contractId, sortKey);
      await deleteStates(nodeDb, contractId);
    } else {
      result = await warp.stateEvaluator.getCache().delete(contractId);
      await deleteStates(nodeDb, contractId);
      await deleteBlacklist(nodeDb, contractId);
      await deleteErrors(nodeDb, contractId);
      await deleteEvents(contractId);
      pruneKvStorage(contractId);
    }
    ctx.body = {
      contractTxId: contractId,
      result: result
    };
    ctx.status = 200;
  } catch (e) {
    ctx.status = e.status || 500;
    ctx.body = { message: e.message };
  }
};

function pruneKvStorage(txId) {
  const kvDir = `./cache/warp/kv/lmdb/${txId}`;
  if (fs.existsSync(kvDir)) {
    fs.rmSync(kvDir, { recursive: true });
  }
}

async function isSigned(txId, signature) {
  return await Arweave.crypto.verify(
    config.nodeJwk.n,
    ArweaveUtils.stringToBuffer(txId),
    ArweaveUtils.b64UrlToBuffer(signature)
  );
}
