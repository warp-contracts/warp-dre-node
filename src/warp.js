const {defaultCacheOptions, WarpFactory} = require("warp-contracts");
const {LmdbCache} = require("warp-contracts-lmdb");
const {NlpExtension} = require("warp-contracts-nlp-plugin");


module.exports = WarpFactory.forMainnet()
  .useStateCache(new LmdbCache({
    ...defaultCacheOptions,
    dbLocation: `./cache/warp/lmdb/state`
  }))
  .useContractCache(new LmdbCache({
    ...defaultCacheOptions,
    dbLocation: `./cache/warp/lmdb/contract`
  }))
  .use(new NlpExtension());