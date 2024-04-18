const { getWarpyUserIds } = require('../../db/nodeDb');
const { config } = require('../../config');
const ADDRESS_LIMIT = 1000;

module.exports = {
  warpyUserIds: async function (ctx) {
    if (!config.availableFunctions.warpyCustomized) {
      ctx.body = 'Warpy custom functionality is disabled';
      ctx.status = 404;
      return;
    }

    const { addresses } = ctx.request.body;

    if (!addresses || addresses.length === 0) {
      ctx.throw(422, 'At least one wallet address must be provided');
    }
    if (addresses.length > ADDRESS_LIMIT) {
      ctx.throw(422, `Exceeded addresses limit of ${ADDRESS_LIMIT}`);
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
