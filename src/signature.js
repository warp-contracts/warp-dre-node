const { config } = require('./config');
const deepHash = require('arweave/node/lib/deepHash').default;
const stringify = require('safe-stable-stringify');
const crypto = require('crypto');

module.exports = {
  signState: async (contractTxId, sortKey, state, manifest, validity) => {
    let validityHash = null;
    const owner = config.nodeJwk.n;
    const arweave = config.arweave;

    const stateHash = hashElement(state);
    if (validity) {
      validityHash = hashElement(validity);
    }

    const dataToSign = await deepHash([
      arweave.utils.stringToBuffer(owner),
      arweave.utils.stringToBuffer(sortKey),
      arweave.utils.stringToBuffer(contractTxId),
      arweave.utils.stringToBuffer(stateHash),
      arweave.utils.stringToBuffer(stringify(manifest))
    ]);
    const rawSig = await arweave.crypto.sign(config.nodeJwk, dataToSign);

    const sig = arweave.utils.bufferTob64Url(rawSig);

    return { sig, stateHash, validityHash };
  }
};

function hashElement(elementToToHash) {
  const stringified = typeof elementToHash != 'string' ? stringify(elementToToHash) : elementToToHash;
  const hash = crypto.createHash('sha256');
  hash.update(stringified);
  return hash.digest('hex');
}
