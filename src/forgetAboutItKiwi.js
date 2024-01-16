require('dotenv').config();
const { warp } = require('./warp');

const contractTxId = 'p5OI99-BaY4QbZts266T7EDwofZqs-wVuYJmMCS0SUU';

(async () => {
  const storage = warp.kvStorageFactory(contractTxId);
  await storage.commit();
})().then(() => console.log(`Finished forgetting`));
