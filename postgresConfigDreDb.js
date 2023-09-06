const { readFileSync } = require('fs');
module.exports = {
  max: 10,
  application_name: process.env.MY_NAME_IS,
  host: process.env.PG_HOST,
  user: 'dre',
  password: process.env.PG_USER_DRE_PASSWORD,
  database: process.env.MY_NAME_IS.toLowerCase(),
  port: 5432,
  ssl: {
    rejectUnauthorized: false,
    ca: readFileSync('certs/db/ca.pem').toString(),
    key: readFileSync('certs/dre/key.pem').toString(),
    cert: readFileSync('certs/dre/cert.pem').toString()
  }
};
