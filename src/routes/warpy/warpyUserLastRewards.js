const { getUserLastRewards } = require('../../db/nodeDb');
const { config } = require('../../config');

module.exports = {
  warpyUserLastRewards: async function (ctx) {
    if (!config.availableFunctions.warpyAggreging) {
      ctx.body = 'Warpy aggreging functionality is disabled';
      ctx.status = 404;
      return;
    }
    const { contractId, userId, limit } = ctx.query;

    if (!contractId) {
      ctx.throw(422, 'Contract id must be provided.');
    }

    if (!userId) {
      ctx.throw(422, 'User id must be provided.');
    }

    if (!limit) {
      ctx.throw(422, 'Limit must be provided.');
    }

    try {
      const result = await getUserLastRewards(contractId, userId, limit);
      ctx.body = {
        result
      };
      ctx.status = 200;
    } catch (e) {
      ctx.body = e.message;
      ctx.status = 500;
    }
  }
};
