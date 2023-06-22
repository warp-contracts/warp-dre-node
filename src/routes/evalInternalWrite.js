const warp = require("../warp");
const Arweave = require("arweave");
const fs = require("fs");
const ArweaveUtils = require("arweave/node/lib/utils");
const { config } = require("../config");
const { isTxIdValid } = require("../common");
const { emptyTransfer, InnerWritesEvaluator } = require("warp-contracts");
const stringify = require("safe-stable-stringify");

const innerWritesEvaluator = new InnerWritesEvaluator();
const owner = config.nodeJwk.n;
const arweave = config.arweave;

module.exports = async (ctx) => {
  const { contractTxId, caller, vrf, strict, input } = ctx.params;

  let errorMessage = null;
  try {
    if (!isTxIdValid(contractTxId)) {
      throw new Error(`Invalid tx id format`);
    }

    if (!isTxIdValid(caller)) {
      throw new Error(`Invalid caller wallet address format`);
    }

    const parsedInput = JSON.parse(input);

    if (!parsedInput) {
      throw new Error("Input not set");
    }

    const effectiveVrf = vrf === "true";
    const effectiveStrict = strict === "true";

    console.log(`Request to evaluate iw for contract ${contractTxId}`);

    const contract = warp.contract(contractTxId);
    const handlerResult = await contract.callContract(
      parsedInput,
      'write',
      caller,
      undefined,
      [],
      emptyTransfer,
      effectiveStrict,
      effectiveVrf,
      false
    );

    errorMessage = "Cannot create interaction: " + JSON.stringify(handlerResult.error || handlerResult.errorMessage);
    const callStack = this.getCallStack();
    const innerWrites = innerWritesEvaluator.eval(callStack);

    const stringified = stringify(innerWrites);

    const rawSig = await arweave.crypto.sign(config.nodeJwk, ArweaveUtils.stringToBuffer(stringified));

    const sig = ArweaveUtils.bufferTob64Url(rawSig);

    ctx.body = {
      contracts: stringified,
      signature: sig,
      publicModulus: owner,
      errorMessage: errorMessage
    };
    ctx.status = 200;
  } catch (e) {
    ctx.body = e.message;
    ctx.status = 500;
  }
};

function pruneKvStorage(txId) {
  const kvDir = `./cache/warp/kv/lmdb/${txId}`;
  if (fs.existsSync(kvDir)) {
    fs.rmSync(kvDir, { recursive: true });
    console.log(`Contract prune - removed ./cache/warp/kv/lmdb/${txId}`);
  }
}


async function isSigned(txId, signature) {
  return await Arweave.crypto.verify(
    config.nodeJwk.n,
    ArweaveUtils.stringToBuffer(txId),
    ArweaveUtils.b64UrlToBuffer(signature)
  );
}
