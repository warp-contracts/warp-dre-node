const { LmdbCache } = require('warp-contracts-lmdb');

const { defaultCacheOptions, WarpFactory, LoggerFactory } = require('warp-contracts');
const { EvaluationProgressPlugin } = require("warp-contracts-evaluation-progress-plugin");
const { NlpExtension } = require("warp-contracts-plugin-nlp");
const { EvmSignatureVerificationServerPlugin } = require("warp-contracts-plugin-signature/server");
const { EthersExtension } = require("warp-contracts-plugin-ethers");
const { VM2Plugin } = require("warp-contracts-plugin-vm2");
const { VRFPlugin } = require("warp-contracts-plugin-vrf");
const { ContractBlacklistPlugin, getDreBlacklistFunction } = require("warp-contracts-plugin-blacklist");
const { getFailures, connect, events } = require("../db/nodeDb");
const { config } = require("../config");
const { EventEmitter } = require("node:events");

(async () => {
  LoggerFactory.INST.logLevel("debug");
  const contractTxId = 'gp9ElQmOf0tCy-tIUPaftAXzi0jtroQTmlYUMwqoDo0'

  const eventEmitter = new EventEmitter();
  eventEmitter.on('progress-notification', (data) => {
    events.progress(data.contractTxId, data.message);
  });
  const warp = WarpFactory.forMainnet()
    .useStateCache(
      new LmdbCache(
        {
          ...defaultCacheOptions,
          dbLocation: `./cache/warp/lmdb/state`
        },
        {
          minEntriesPerContract: 5,
          maxEntriesPerContract: 20
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
    );
  warp.whoAmI = 'DRE';


  const contract = warp.contract(contractTxId)
    .setEvaluationOptions({
      internalWrites: true
    });

  const result = await contract.readState();
  console.dir(result.cachedValue.validity);


})();

