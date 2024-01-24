const { readFileSync } = require("fs");
module.exports = {
  minEntriesPerContract: process.env.PG_MIN_CONTRACT_ENTRIES ? parseInt(process.env.PG_MIN_CONTRACT_ENTRIES) : 100,
  maxEntriesPerContract: process.env.PG_MAX_CONTRACT_ENTRIES ? parseInt(process.env.PG_MAX_CONTRACT_ENTRIES) : 1000,
  application_name: process.env.MY_NAME_IS,
  host: process.env.PG_HOST,
  user: process.env.PG_USER_WARP,
  password: process.env.PG_USER_WARP_PASSWORD,
  database: process.env.PG_DATABASE.toLowerCase(),
  idle_in_transaction_session_timeout: 300000,
  port: process.env.PG_PORT,
  ...(process.env.PG_SSL === "true" ? {
    ssl: {
      rejectUnauthorized: false,
      ca: readFileSync('certs/db/ca.pem').toString(),
      key: readFileSync('certs/db/warp/key.pem').toString(),
      cert: readFileSync('certs/db/warp/cert.pem').toString()
    }
  } : ''),
};
