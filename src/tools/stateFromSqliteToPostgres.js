const { defaultCacheOptions } = require("warp-contracts");
const { SqliteContractCache } = require("warp-contracts-sqlite");
const cliProgress = require("cli-progress");
const { PgContractCache } = require("warp-contracts-postgres");

const sqlite = new SqliteContractCache({
  ...defaultCacheOptions,
  dbLocation: `./cache/from_dre_bazar_5/sdk/sqlite/state`
});
const sqliteStorage = sqlite.storage();

const postgres = new PgContractCache(
  defaultCacheOptions,
  {
    minEntriesPerContract: 100,
    maxEntriesPerContract: 1000,
    host: "localhost",
    user: "postgres",
    password: "postgres",
    database: "postgres",
    port: 32769
  }
);
const pgStorage = postgres.storage();

(async () => {
  console.log("Rewriting SQLite cache to postgres cache");
  console.log("Heap stats:", require("v8").getHeapStatistics());

  const bar = new cliProgress.SingleBar(
    {
      etaBuffer: 1000
    },
    cliProgress.Presets.shades_classic
  );
  await postgres.open();
  const allItems = sqliteStorage
    .prepare(`select count(*) from sort_key_cache;`)
    .pluck()
    .get();
  bar.start(allItems, 0);

  let i = 0;
  const stmt = sqliteStorage.prepare('SELECT * FROM sort_key_cache');
  for (const row of stmt.iterate()) {
    i++;
    if (row.sort_key != null) {
      await pgStorage.query(`
          INSERT INTO sort_key_cache (key, sort_key, value, state_hash, validity_hash)
          VALUES ($1, $2, (($3)::jsonb ->> 'state')::jsonb, $4, $5)
          ON CONFLICT(key, sort_key) DO UPDATE SET value = EXCLUDED.value`,
        [row.key, row.sort_key, row.value, row.state_hash, row.validity_hash]);
      // for (const tx in jsonVal.validity) {
        await pgStorage.query(`
            INSERT INTO validity(key, sort_key, tx_id, valid, error_message)
            with start as (
                select ($3)::jsonb as val
            ), evalState as (
                select (val ->> 'validity')::jsonb as validity, val ->> 'errorMessages' as error from start
            )
            select $1, $2, key, value::boolean, error::jsonb ->> key from evalState, jsonb_each(validity)
            ON CONFLICT(key, tx_id)  DO UPDATE SET sort_key = excluded.sort_key, valid = excluded.valid, error_message = excluded.error_message
        `,
          [row.key, row.sort_key, row.value])
    }
    bar.increment();
  }

  bar.stop();

  console.log(`Finished`);
  await sqlite.close();
  await postgres.close();
  console.log(`SQLite connection closed`);
})();
