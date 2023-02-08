const { defaultCacheOptions, WarpFactory } = require('warp-contracts');
const { LmdbCache } = require('warp-contracts-lmdb');
const { NlpExtension } = require('warp-contracts-plugin-nlp');
const { EvaluationProgressPlugin } = require('warp-contracts-evaluation-progress-plugin');
const { EventEmitter } = require('node:events');
const { events } = require('./db/nodeDb');
const { EthersExtension } = require('warp-contracts-plugin-ethers');
const { EvmSignatureVerificationServerPlugin } = require('warp-contracts-plugin-signature/server');

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
  .use(new EthersExtension());
