const { getSyncLog } = require('../db/nodeDb');

module.exports = async (ctx) => {
  const startTimestamp = parseInt(ctx.query.start);
  const endTimestamp = parseInt(ctx.query.end);
  const nodeDb = ctx.nodeDb;

  try {
    const result = await getSyncLog(nodeDb, startTimestamp, endTimestamp);
    ctx.body = result;
    ctx.status = 200;
  } catch (e) {
    ctx.body = e.message;
    ctx.status = 500;
  }
};
