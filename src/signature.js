const {readNodeJwk, getArweave} = require("./config");
const deepHash = require("arweave/node/lib/deepHash").default;
const stringify = require("safe-stable-stringify");
const crypto = require("crypto");

module.exports = {
  signState: async (contractTxId, sortKey, state, manifest) => {
    const jwk = readNodeJwk();
    const owner = jwk.n;
    const arweave = getArweave();

    const stringifiedState = stringify(state);
    const hash = crypto.createHash('sha256');
    hash.update(stringifiedState);
    const stateHash = hash.digest('hex');

    const dataToSign = await deepHash([
      arweave.utils.stringToBuffer(owner),
      arweave.utils.stringToBuffer(sortKey),
      arweave.utils.stringToBuffer(contractTxId),
      arweave.utils.stringToBuffer(stateHash),
      arweave.utils.stringToBuffer(stringify(manifest))
    ]);
    const rawSig = await arweave.crypto.sign(jwk, dataToSign);

    const sig = arweave.utils.bufferTob64Url(rawSig);

    return {sig, stringifiedState, stateHash};
  }
}