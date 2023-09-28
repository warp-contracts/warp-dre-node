const { readFileSync } = require("fs");
module.exports = {
  minEntriesPerContract: 1000000,
  maxEntriesPerContract: 10000000,
  application_name: process.env.MY_NAME_IS,
  host: process.env.PG_HOST,
  user: 'warp',
  password: process.env.PG_USER_WARP_PASSWORD,
  database: process.env.PG_DATABASE.toLowerCase(),
  port: process.env.PG_PORT,
 /* ssl: {
    rejectUnauthorized: false,
    ca: readFileSync('certs/db/ca.pem').toString(),
    key: readFileSync('certs/warp/key.pem').toString(),
    cert: readFileSync('certs/warp/cert.pem').toString()
  }*/
};
