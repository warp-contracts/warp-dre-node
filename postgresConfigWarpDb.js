const { readFileSync } = require("fs");
module.exports = {
  minEntriesPerContract: 100,
  maxEntriesPerContract: 1000,
  application_name: process.env.MY_NAME_IS,
  host: process.env.PG_HOST,
  user: process.env.PG_USER_WARP,
  password: process.env.PG_USER_WARP_PASSWORD,
  database: process.env.PG_DATABASE.toLowerCase(),
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
