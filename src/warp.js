const Arweave = require("arweave");
const {defaultCacheOptions, WarpFactory} = require("warp-contracts");
const {LmdbCache} = require("warp-contracts-lmdb");

const arweave = Arweave.init({
  host: 'arweave.net',
  port: 443, // Port
  protocol: 'https', // Network protocol http or https
  timeout: 60000, // Network request timeouts in milliseconds
  logging: false // Enable network request logging
});

module.exports = WarpFactory.forMainnet()
  .useStateCache(new LmdbCache({
    ...defaultCacheOptions,
    dbLocation: `./cache/warp/state`
  }))
  .useContractCache(new LmdbCache({
    ...defaultCacheOptions,
    dbLocation: `./cache/warp/contract`
  }));