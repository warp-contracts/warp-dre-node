const {defaultCacheOptions, WarpFactory} = require("warp-contracts");
const {LmdbCache} = require("warp-contracts-lmdb");
const {NlpManager} = require("node-nlp");

class NlpExtension {
  process(input) {
    input.NlpManager = NlpManager;
  }

  type() {
    return 'smartweave-extension';
  }
}

module.exports = WarpFactory.forMainnet()
  .useStateCache(new LmdbCache({
    ...defaultCacheOptions,
    dbLocation: `./cache/warp/state`
  }))
  .useContractCache(new LmdbCache({
    ...defaultCacheOptions,
    dbLocation: `./cache/warp/contract`
  }))
  .use(new NlpExtension());