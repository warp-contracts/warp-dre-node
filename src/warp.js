const {defaultCacheOptions, WarpFactory} = require("warp-contracts");
const {LmdbCache} = require("warp-contracts-lmdb");
const {NlpExtension} = require("warp-contracts-nlp-plugin");
const {EvaluationProgressPlugin} = require("warp-contracts-evaluation-progress-plugin");
const {EventEmitter} = require("node:events")
const {events} = require("./db/nodeDb");

const eventEmitter = new EventEmitter();
eventEmitter.on('progress-notification', (data) => {
  events.progress(data.contractTxId, data.message);
});

module.exports = WarpFactory.forMainnet()
  .useStateCache(new LmdbCache({
    ...defaultCacheOptions,
    dbLocation: `./cache/warp/lmdb/state`
  }, {
    minEntriesPerContract: 10,
    maxEntriesPerContract: 50
  }))
  .useContractCache(new LmdbCache({
    ...defaultCacheOptions,
    dbLocation: `./cache/warp/lmdb/contract`
  }))
  .use(new EvaluationProgressPlugin(eventEmitter, 500))
  .use(new NlpExtension());