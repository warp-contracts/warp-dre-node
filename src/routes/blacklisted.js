const {getAllBlacklisted} = require("../db/nodeDb");

module.exports = async (ctx) => {
  try {
    const response = {};
    ctx.body = await getAllBlacklisted(ctx.nodeDb);
    ctx.status = 200;
  } catch (e) {
    ctx.body = e.message;
    ctx.status = 500;
  }

};
