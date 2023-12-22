const path = require('path');

module.exports = {
  client: 'better-sqlite3',
  connection: {
    filename: path.resolve(__dirname, `sqlite/node-events.sqlite`)
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
    directory: './src/db/migrations/eventsDb'
  }
};
