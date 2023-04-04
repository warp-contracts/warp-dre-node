const { defaultCacheOptions, WarpFactory } = require('warp-contracts');
const { LmdbCache } = require('warp-contracts-lmdb');
const { NlpExtension } = require('warp-contracts-plugin-nlp');
const { EvaluationProgressPlugin } = require('warp-contracts-evaluation-progress-plugin');
const { EventEmitter } = require('node:events');
const { events, connect, getFailures } = require('./db/nodeDb');
const { EthersExtension } = require('warp-contracts-plugin-ethers');
const { EvmSignatureVerificationServerPlugin } = require('warp-contracts-plugin-signature/server');
const { ContractBlacklistPlugin, getDreBlacklistFunction } = require('warp-contracts-plugin-blacklist');
const { config } = require('./config');

const eventEmitter = new EventEmitter();
eventEmitter.on('progress-notification', (data) => {
  events.progress(data.contractTxId, data.message);
});

module.exports = WarpFactory.forMainnet()
  .useStateCache(
    new LmdbCache(
      {
        ...defaultCacheOptions,
        dbLocation: `./cache/warp/lmdb/state`
      },
      {
        minEntriesPerContract: 10,
        maxEntriesPerContract: 50
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
        maxEntriesPerContract: 10
      }
    ),
    new LmdbCache(
      {
        ...defaultCacheOptions,
        dbLocation: `./cache/warp/lmdb/source`
      },
      {
        minEntriesPerContract: 1,
        maxEntriesPerContract: 10
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
          minEntriesPerContract: 1,
          maxEntriesPerContract: 10
        }
      )
  )
  .use(new EvaluationProgressPlugin(eventEmitter, 500))
  .use(new NlpExtension())
  .use(new EvmSignatureVerificationServerPlugin())
  .use(new EthersExtension())
  .use(
    new ContractBlacklistPlugin(async (input) => {
      const blacklistFunction = await getDreBlacklistFunction(getFailures, connect(), config.workersConfig.maxFailures);
      return await blacklistFunction(input);
    })
  );
