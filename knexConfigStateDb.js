module.exports = {
  client: 'better-sqlite3',
  connection: {
    filename: `sqlite/node.sqlite`
  },
  useNullAsDefault: true,
  pool: {
      afterCreate: (conn, cb) => {
        // https://github.com/knex/knex/issues/4971#issuecomment-1030701574
        conn.pragma('journal_mode = WAL');
        cb();
      }
    },
  migrations: {
    directory: 'src/db/migrations/stateDb'
  }
};
