const Redis = require("ioredis");
const {readGwPubSubConfig} = require("../config");

const updates = new Map();

const chillOutTimeSeconds = 10;

module.exports = async (ctx) => {
  const contractTxId = ctx.query.id;
  try {
    if (!isTxIdValid(contractTxId)) {
      throw new Error('Invalid tx id format');
    }
    const now = new Date();

    console.log('===== SYNC now, ', now);
    console.log('===== UPDATES has, ', updates.has(contractTxId));
    console.log('===== UPDATES get, ', updates.get(contractTxId));
    console.log('===== UPDATES passed, ', (now - updates.get(contractTxId)) / 1000);

    if (updates.has(contractTxId) && (now - updates.get(contractTxId)) / 1000 < chillOutTimeSeconds) {
      throw new Error(`Chill out and wait ${chillOutTimeSeconds}s`);
    }
    const test = ctx.query.test !== 'false';
    const connectionOptions = readGwPubSubConfig();

    const publisher = new Redis(connectionOptions);
    await publisher.connect();
    const channel = 'contracts';

    const message = {contractTxId, test, interaction: {}};
    publisher.publish(channel, JSON.stringify(message));
    updates.set(contractTxId, now);

    ctx.body = 'Scheduled for update';
    ctx.status = 200;
  } catch (e) {
    ctx.body = e.message;
    ctx.status = 500;
  }
};

function isTxIdValid(txId) {
  const validTxIdRegex = /[a-z0-9_-]{43}/i;
  return validTxIdRegex.test(txId);
}
