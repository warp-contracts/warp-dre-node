const { defaultCacheOptions } = require('warp-contracts');
const { SqliteContractCache } = require("warp-contracts-sqlite");

const sqlite = new SqliteContractCache({
  ...defaultCacheOptions,
  dbLocation: `./cache/warp/sqlite/state`
});

(async () => {
  const stats = await sqlite.prune(1);
  console.log(stats);
})();
