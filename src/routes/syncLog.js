const { getSyncLog } = require('../db/nodeDb');

module.exports = async (ctx) => {
  const startTimestamp = parseInt(ctx.query.start);
  const endTimestamp = parseInt(ctx.query.end);

  try {
    const result = await getSyncLog(startTimestamp, endTimestamp);
    ctx.body = result;
    ctx.status = 200;
  } catch (e) {
    ctx.body = e.message;
    ctx.status = 500;
  }
};
