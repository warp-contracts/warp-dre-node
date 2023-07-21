const Arweave = require('arweave');
const ArweaveUtils = require('arweave/node/lib/utils');
const { deleteStatesFrom, eraseWarpSortKeyCacheFrom } = require('../db/nodeDb');
const { config } = require('../config');

module.exports = async (ctx) => {
  const { nodeDb, nodeDbWarpState } = ctx;
  const signature = ctx.query.signature;

  /* Pruning all contracts states from a specified sortKey () is only valid for
   * - non kvStorage contracts
   * - sqlite based contract cache
   *  */
  const sortKey = ctx.query.sortKey;

  console.log(`wtf??`);
  try {
    if (!sortKey) {
      ctx.throw(422, 'Missing sort key');
    }
    if (!signature) {
      ctx.throw(422, 'Missing signature');
    }
    if (!(await isSigned(sortKey, signature))) {
      ctx.throw(400, 'Invalid tx signature');
    }

    let result = await eraseWarpSortKeyCacheFrom(nodeDbWarpState, sortKey);
    await deleteStatesFrom(nodeDb, sortKey);

    ctx.body = {
      sortKey: sortKey,
      result: result
    };
    ctx.status = 200;
  } catch (e) {
    ctx.status = e.status || 500;
    ctx.body = { message: e.message };
  }
};

async function isSigned(txId, signature) {
  return await Arweave.crypto.verify(
    config.nodeJwk.n,
    ArweaveUtils.stringToBuffer(txId),
    ArweaveUtils.b64UrlToBuffer(signature)
  );
}
