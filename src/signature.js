const { config } = require('./config');
const stringify = require('safe-stable-stringify');
const crypto = require('crypto');
const { concatBuffers, stringToBuffer, bufferTob64Url } = require("arweave/node/lib/utils");

module.exports = {
  signState: async (contractTxId, sortKey, state) => {
    const owner = config.nodeJwk.n;
    const arweave = config.arweave;

    const stateHash = hashElement(state);

    const dataToSign = concatBuffers([
      stringToBuffer(owner),
      stringToBuffer(sortKey),
      stringToBuffer(contractTxId),
      stringToBuffer(stateHash)
    ]);

    const rawSig = await arweave.crypto.sign(config.nodeJwk, dataToSign);
    const sig = bufferTob64Url(rawSig);

    return { sig, stateHash };
  },

  hashElement: hashElement
};

function hashElement(elementToHash) {
  const stringified = typeof elementToHash != 'string' ? stringify(elementToHash) : elementToHash;
  const hash = crypto.createHash('sha256');
  hash.update(stringified);
  return hash.digest('hex');
}
