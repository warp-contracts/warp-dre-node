const { LmdbCache } = require('warp-contracts-lmdb');

const { defaultCacheOptions } = require('warp-contracts');

const lmdb = new LmdbCache(
  {
    ...defaultCacheOptions,
    dbLocation: `./cache/warp/kv/lmdb/p5OI99-BaY4QbZts266T7EDwofZqs-wVuYJmMCS0SUU`
  },
  {
    minEntriesPerContract: 3,
    maxEntriesPerContract: 10
  }
);

(async () => {
  await lmdb.commit();
  console.log("committed");
  //console.log(stats);
})();
