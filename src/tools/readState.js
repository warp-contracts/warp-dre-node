const {defaultCacheOptions, WarpFactory} = require("warp-contracts");
const {LmdbCache} = require("warp-contracts-lmdb");

function readState() {
  const warp = WarpFactory.forMainnet()
    .useStateCache(new LmdbCache({
      ...defaultCacheOptions,
      dbLocation: `./cache/warp/lmdb/state`
    }))
    .useContractCache(new LmdbCache({
      ...defaultCacheOptions,
      dbLocation: `./cache/warp/lmdb/contract`
    }));

  warp.contract("Daj-MNSnH55TDfxqC7v4eq0lKzVIwh98srUaWqyuZtY")
    .setEvaluationOptions({
      allowBigInt: true,
    })
    .readState().finally(() => {
      console.log('done');
    }
  );
}


readState();