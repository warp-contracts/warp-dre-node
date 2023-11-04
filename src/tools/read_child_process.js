const { NlpExtension } = require("warp-contracts-plugin-nlp");
const { EthersExtension } = require("warp-contracts-plugin-ethers");
const { VM2Plugin } = require("warp-contracts-plugin-vm2");
const { VRFPlugin } = require("warp-contracts-plugin-vrf");
const { LmdbCache } = require("warp-contracts-lmdb");
const { SqliteContractCache } = require("warp-contracts-sqlite");
const { defaultCacheOptions, LoggerFactory, WarpFactory } = require("warp-contracts");
const stringify = require("safe-stable-stringify");
const fs = require("fs");
const { EvmSignatureVerificationServerPlugin } = require('warp-contracts-plugin-signature/server');
const { JWTVerifyPlugin } = require("@othent/warp-contracts-plugin-jwt-verify");
const crypto = require("crypto");

async function readState() {
  LoggerFactory.INST.logLevel("debug");
  LoggerFactory.INST.logLevel("debug", 'WarpGatewayInteractionsLoader');

  const warp = WarpFactory.forMainnet()
    .useStateCache(
      new SqliteContractCache(
        {
          ...defaultCacheOptions,
          dbLocation: `./cache/warp/sqlite/state`
        },
        {
          maxEntriesPerContract: 1000
        }
      )
    )
    .useContractCache(
      new LmdbCache(
        {
          ...defaultCacheOptions,
          dbLocation: `./cache/warp/lmdb/contract`
        },
        {
          minEntriesPerContract: 1,
          maxEntriesPerContract: 5
        }
      ),
      new LmdbCache(
        {
          ...defaultCacheOptions,
          dbLocation: `./cache/warp/lmdb/source`
        },
        {
          minEntriesPerContract: 1,
          maxEntriesPerContract: 5
        }
      )
    )
    .useKVStorageFactory(
      (contractTxId) =>
        new LmdbCache(
          {
            ...defaultCacheOptions,
            dbLocation: `./cache/warp/kv/lmdb/${contractTxId}`
          },
          {
            minEntriesPerContract: 3,
            maxEntriesPerContract: 10
          }
        )
    )
    .use(new NlpExtension())
    .use(new EvmSignatureVerificationServerPlugin())
    .use(new EthersExtension())
    .use(new VM2Plugin())
    .use(new VRFPlugin())
    .use(new JWTVerifyPlugin());

  const contractId = 'n5VT4O_4LeJMvV_S6yCSa6OengwN7FTPDHMV9TtrtoM';


  const contract = warp.contract(contractId)
    .setEvaluationOptions({
      allowBigInt: true,
      internalWrites: true,
      maxCallDepth: 666,
      maxInteractionEvaluationTimeSeconds: 20000,
      unsafeClient: "skip",
      cacheEveryNInteractions: 2000,
      whitelistSources: [
      ]
    });

  const evalResult = await contract.readState();
  const evalState = evalResult.cachedValue.state;
  const sortKey = evalResult.sortKey;

  console.log(`SortKey: ${sortKey}`);

  fs.writeFileSync(`u_${Date.now()}.json`, JSON.stringify(evalResult, null ,2));

  console.log('State hash', hashElement(evalState));
  console.log('Validity count', Object.keys(evalResult.cachedValue.validity).length);
  console.log('Validity hash', hashElement(evalResult.cachedValue.validity));

  return evalResult;
};

process.send()

function hashElement(elementToHash) {
  const stringified = typeof elementToHash != 'string' ? stringify(elementToHash) : elementToHash;
  const hash = crypto.createHash('sha256');
  hash.update(stringified);
  return hash.digest('hex');
}