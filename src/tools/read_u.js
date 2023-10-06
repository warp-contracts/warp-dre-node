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

(async function() {


// N2eWCCU5ng8AgYcKIbqCT7xn3eLJWlZvnUoqwK7tyZU
// 000001207142,0000000000000,a53b31607b8bfb30223a53799e7e71ade1518780b335a0d59bf6bf667fd15e2a
  LoggerFactory.INST.logLevel("debug");
  LoggerFactory.INST.logLevel("debug", 'WarpGatewayInteractionsLoader');
  const zarContract = "iAGHqY1TNC8AmLkTHi3bo-WDExJUbCbmPTYy1bHiHwE";
  const uContract = "KTzTXT_ANmF84fWEKHzWURD1LWd9QaFR9yfYUwH2Lxw";

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


  const contract = warp.contract("fLOpXe97Gf0X9BEf9QklyOLXt_v63a7U5RsZ9wsE000")
    .setEvaluationOptions({
      allowBigInt: true,
      internalWrites: true,
      maxCallDepth: 666,
      maxInteractionEvaluationTimeSeconds: 20000,
      unsafeClient: "skip",
      cacheEveryNInteractions: 2000,
      whitelistSources: [
        "00elNGZCnqSfVIBUUOBeFB8VGg0nX8vCiDyZed0Zdys",
        "SpKjw3fTwsH0RSk_mfnNN9jlwYWlnPjwRhLzgFz7hM0",
        "Z9PGIe0SIXb-UU7970dFOodvOXNh_WMhJ-bXr6GRVoY",
        "xIDRxGWDdWdDkeWTouh937orxGC2hWuYgVu14z1Ks1Q",
        "3MiQ250Mddx1fwerlg6ix4uhkUiNeFuL27nvs1ZJkhs",
        "3F2xKBP_2IbF9483zIxl68fgHlHGoIPhTjwGUwz2t9g",
        "UYnZedG34A4LkEGY8VDs75yaUHbUPU4Rd2w5OmEHmLk",
        "oKv8zRWXbPgYTyf2y1OLdwBQtm5zs0SQ_tM6KGOYdD8"
      ]
    });

  const evalResult = await contract.readState("000001259674,1694484200143,6d27538968dd365be1dc522368f69d012ef8655da6102f089653aaa75af7540b");
  const evalState = evalResult.cachedValue.state;
  const sortKey = evalResult.sortKey;

  console.log(`SortKey: ${sortKey}`);

  fs.writeFileSync(`u_${Date.now()}.json`, JSON.stringify(evalResult, null ,2));

  console.log('State hash', hashElement(evalState));
  console.log('Validity count', Object.keys(evalResult.cachedValue.validity).length);
  console.log('Validity hash', hashElement(evalResult.cachedValue.validity));
})();

function hashElement(elementToHash) {
  const stringified = typeof elementToHash != 'string' ? stringify(elementToHash) : elementToHash;
  const hash = crypto.createHash('sha256');
  hash.update(stringified);
  return hash.digest('hex');
}