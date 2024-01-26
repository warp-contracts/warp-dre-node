const { getWarpyUserId } = require('../../db/nodeDb');
const { config } = require('../../config');

module.exports = {
  warpyUserId: async function (ctx) {
    if (!config.availableFunctions.warpyAggreging) {
      ctx.body = 'Warpy aggreging functionality is disabled';
      ctx.status = 404;
      return;
    }

    const { address } = ctx.query;

    if (!address) {
      ctx.throw(422, 'Wallet address must be provided.');
    }

    try {
      const result = await getWarpyUserId(address);
      ctx.body = result;
      ctx.status = 200;
    } catch (e) {
      ctx.body = e.message;
      ctx.status = 500;
    }
  }
};
