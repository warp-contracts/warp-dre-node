const { getWarpyUserIds } = require('../../db/nodeDb');
const { config } = require('../../config');

module.exports = {
  warpyUserIds: async function (ctx) {
    if (!config.availableFunctions.warpyAggreging) {
      ctx.body = 'Warpy aggreging functionality is disabled';
      ctx.status = 404;
      return;
    }

    const { addresses } = ctx.request.body;

    if (!addresses || addresses.length === 0) {
      ctx.throw(422, 'At least one wallet address must be provided');
    }

    try {
      ctx.body = await getWarpyUserIds(addresses);
      ctx.status = 200;
    } catch (e) {
      ctx.body = e.message;
      ctx.status = 500;
    }
  }
};
