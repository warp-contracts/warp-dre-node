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
// .use(new JWTVerifyPlugin());


  const contract = warp.contract(uContract)
    .setEvaluationOptions({
      allowBigInt: true,
      internalWrites: true,
      maxCallDepth: 666,
      maxInteractionEvaluationTimeSeconds: 20000,
      unsafeClient: "skip",
      cacheEveryNInteractions: 2000,
      whitelistSources: [
        "Of9pi--Gj7hCTawhgxOwbuWnFI1h24TTgO5pw8ENJNQ",
        "W78KEzU8vIODFHzwa9ab7SS7Pjchc7KenivCiwSHxBY",
        "kP1Ed8AMvaaBrEFjatP4pSmiE_fsRrGS0EcBMQYYiyc",
        "mGxosQexdvrvzYCshzBvj18Xh1QmZX16qFJBuh4qobo",
        "7qv5x9A0NgAlTdMnBc1H2HFvN-te0kzzuT9RNt_66g8",
        "eIAyBgHH-H7Qzw9fj7Austj30QKPQn27eaakvpOUSR8",
        "Of9pi--Gj7hCTawhgxOwbuWnFI1h24TTgO5pw8ENJNQ",
        "ovWCp0xKuHtq-bADXbtiNr6umwb_AE73kVZWtfHlX3w",
        "1hDZBRSptTNgnACuO9qGHLbaOfnAcMBKCHcHPRhMWUY",
        "LBcYEl2zwKDApj1Cow1_BYyiicxVV7OCZTexsjk6mB4",
        "dRTFmLwJ3cNqdNvFK4yUvwc13CrJtFOmLymLxL4HWOE",
        "yXPm9-9VyxH9otGf7xim0EJsnt21IJN8qJjanFTC_kc",
        "qOd7mNAJdju9PxtsRJbel4Zu3xYgEwUbxW8U14czjD8",
        "0GOnb0o9c232d6SXF_HXHbGzfIdiYeos7U5jobOSZ_c",
        "8kPgNMm7dZUVk93T7wq05otEy1oDNqZhyD3L7WrcMTY",
        "yDAppVePqGU1qcRnxdk-AShpIJ0RHCZixOMXtJTgm4Y",
        "W7V0n7g2UKhCee1QDTpvAq6eI6pP9jCS860uF70TbYY",
        "h9v17KHV4SXwdW2-JHU6a23f6R0YtbXZJJht8LfP8QM"
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