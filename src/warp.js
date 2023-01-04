const { defaultCacheOptions, WarpFactory } = require('warp-contracts');
const { LmdbCache } = require('warp-contracts-lmdb');
const { NlpExtension } = require('warp-contracts-plugin-nlp');
const { EvaluationProgressPlugin } = require('warp-contracts-evaluation-progress-plugin');
const { EventEmitter } = require('node:events');
const { events } = require('./db/nodeDb');
const { EthersExtension } = require('warp-contracts-plugin-ethers');
const { EvmSignatureVerificationServerPlugin } = require('warp-contracts-plugin-signature/server');
const { open } = require('lmdb');

const eventEmitter = new EventEmitter();
eventEmitter.on('progress-notification', (data) => {
  events.progress(data.contractTxId, data.message);
});

module.exports = WarpFactory.forMainnet()
  .useStateCache(
    new LmdbCache({
      ...defaultCacheOptions,
      dbLocation: `./cache/warp/lmdb/state`
    })
  )
  .useContractCache(
    new LmdbCache({
      ...defaultCacheOptions,
      dbLocation: `./cache/warp/lmdb/contract`
    })
  )
  .useKVStorageFactory((contractTxId) => new LMDBTrie(`./cache/warp/kv/lmdb/${contractTxId}`))
  .use(new EvaluationProgressPlugin(eventEmitter, 500))
  .use(new NlpExtension())
  .use(new EvmSignatureVerificationServerPlugin())
  .use(new EthersExtension());

class LMDBTrie {
  constructor(path) {
    this.path = path;
    this.database = open({
      name: '@ethereumjs/trie',
      path
    });
  }

  async get(key) {
    return this.database.get(key);
  }

  async put(key, val) {
    await this.database.put(key, val);
  }

  async del(key) {
    await this.database.remove(key);
  }

  async batch(opStack) {
    for (const op of opStack) {
      if (op.type === 'put') {
        await this.put(op.key, op.value);
      }

      if (op.type === 'del') {
        await this.del(op.key);
      }
    }
  }

  copy() {
    return new LMDBTrie(this.path);
  }

  async open() {
    // noop
  }

  async close() {
    // noop
  }
}
