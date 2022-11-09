const Arweave = require("arweave");
const {LoggerFactory, defaultCacheOptions, WarpFactory, defaultWarpGwOptions} = require("warp-contracts");
const {LmdbCache} = require("warp-contracts-lmdb");

const arweave = Arweave.init({
  host: 'arweave.net',
  port: 443, // Port
  protocol: 'https', // Network protocol http or https
  timeout: 60000, // Network request timeouts in milliseconds
  logging: false // Enable network request logging
});

const cacheOptions = {
  ...defaultCacheOptions,
  dbLocation: `./cache/warp/state`
}

module.exports = WarpFactory
  .custom(arweave, cacheOptions, 'mainnet', new LmdbCache({
    ...cacheOptions,
    dbLocation: `./cache/warp/contracts`
  }))
  .useWarpGateway(defaultWarpGwOptions, defaultCacheOptions, new LmdbCache({
    ...defaultCacheOptions,
    dbLocation: `./cache/warp/contracts`
  }))
  .build();