const { getWarpyUserCounter } = require('../../db/nodeDb');
const { config } = require('../../config');

module.exports = {
  warpyUserCounter: async function (ctx) {
    if (!config.availableFunctions.warpyAggreging) {
      ctx.body = 'Warpy aggreging functionality is disabled';
      ctx.status = 404;
      return;
    }

    const { userId } = ctx.query;

    if (!userId) {
      ctx.throw(422, 'User id must be provided.');
    }

    try {
      const result = await getWarpyUserCounter(userId);
      ctx.body = result;
      ctx.status = 200;
    } catch (e) {
      ctx.body = e.message;
      ctx.status = 500;
    }
  }
};
