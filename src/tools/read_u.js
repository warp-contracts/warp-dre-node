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

(async function() {


// N2eWCCU5ng8AgYcKIbqCT7xn3eLJWlZvnUoqwK7tyZU
// 000001207142,0000000000000,a53b31607b8bfb30223a53799e7e71ade1518780b335a0d59bf6bf667fd15e2a
  LoggerFactory.INST.logLevel("debug");
  LoggerFactory.INST.logLevel("debug", 'WarpGatewayInteractionsLoader');
  const contractTxId = "KTzTXT_ANmF84fWEKHzWURD1LWd9QaFR9yfYUwH2Lxw";

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
// .use(new JWTVerifyPlugin());


  const contract = warp.contract(contractTxId)
    .setEvaluationOptions({
      allowBigInt: true,
      internalWrites: true,
      maxCallDepth: 666,
      maxInteractionEvaluationTimeSeconds: 20000,
      unsafeClient: "skip",
      cacheEveryNInteractions: 2000
    });

  // dre-6 a55a7cb597b2f6beb36a2b77b93b4cabc4383542761741708daa33285aa0e125
  // dre-5 66a77e284adb34b6d3f8495a655a99d4f23069f5b8e8634cf11d10d869b22c85
  const evalResult = await contract.readState("000001224512,0000000000000,f7071c8cde26e34282bab15f9ab33f7fea5f4efbf655a41f9a914977b5a40962");
  // const evalResult = await contract.readState("000001207142,0000000000000,a53b31607b8bfb30223a53799e7e71ade1518780b335a0d59bf6bf667fd15e2a");
  const evalState = evalResult.cachedValue.state;
  const sortKey = evalResult.sortKey;

  console.log(`SortKey: ${sortKey}`);

  fs.writeFileSync(`u_${Date.now()}.json`, JSON.stringify(evalResult, null ,2));

  // console.dir(evalResult, { depth: null });
  // console.dir(contract.getCallStack(), { depth: null });




})();