const {defaultCacheOptions, WarpFactory} = require("warp-contracts");
const {LmdbCache} = require("warp-contracts-lmdb");
const {getArweave} = require("../config");

async function readState() {
  const warp = WarpFactory.forMainnet()
    .useStateCache(new LmdbCache({
      ...defaultCacheOptions,
      dbLocation: `./cache/warp/lmdb/state`
    }))
    .useContractCache(new LmdbCache({
      ...defaultCacheOptions,
      dbLocation: `./cache/warp/lmdb/contract`
    }));

  const result = await warp.contract("pbabEjmdaqOvF-yTkFhs5i2lbmmbC6s4NrUqM_8eAYE")
    .setEvaluationOptions({
      allowBigInt: true,
    }).readState();

  console.log(Object.keys(result.cachedValue.validity).length);
}


readState().finally();