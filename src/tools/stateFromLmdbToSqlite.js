const { LmdbCache } = require("warp-contracts-lmdb");

const { defaultCacheOptions } = require("warp-contracts");
const { SqliteContractCache } = require("warp-contracts-sqlite");
const cliProgress = require("cli-progress");


const lmdb = new LmdbCache({
  ...defaultCacheOptions,
  dbLocation: `./cache/warp/lmdb/state`
}).storage();

const sqlite = new SqliteContractCache({
  ...defaultCacheOptions,
  dbLocation: `./cache/warp/sqlite/state`
});

(async () => {
  console.log("Rewriting LMDB cache to SQLite cache");
  console.log("Heap stats:", require("v8").getHeapStatistics());

  const bar = new cliProgress.SingleBar(
    {
      etaBuffer: 1000
    },
    cliProgress.Presets.shades_classic
  );
  bar.start(lmdb.getKeysCount(), 0);

  lmdb.transactionSync(() => {
    lmdb.getRange({ snapshot: true }).forEach(({ key, value }) => {
      try {
        if (value.value !== undefined) {
          sqlite.put({ key: key.split("|")[0], sortKey: key.split("|")[1] }, value.value);
        } else {
          sqlite.put({ key: key.split("|")[0], sortKey: key.split("|")[1] }, value);
        }
        bar.increment();
      } catch (e) {
        console.error(`Failed to store ${key}`, e)
      }
    });
  });

  bar.stop();

  console.log(`Finished`);
  await sqlite.close();
  console.log(`SQLite connection closed`);
})();
