const { LmdbCache } = require('warp-contracts-lmdb');

const { defaultCacheOptions } = require('warp-contracts');

const lmdb = new LmdbCache({
  ...defaultCacheOptions,
  dbLocation: `./cache/warp/lmdb/state`
});

(async () => {
  const contractTxId = 'gp9ElQmOf0tCy-tIUPaftAXzi0jtroQTmlYUMwqoDo0'
  await lmdb.delete(contractTxId);
})();

