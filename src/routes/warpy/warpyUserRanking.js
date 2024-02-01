const { getWarpyUserRanking } = require('../../db/nodeDb');
const { config } = require('../../config');

const DEFAULT_RANKING_LIMIT = 15;

module.exports = {
  warpyUserBalance: async function (ctx) {
    if (!config.availableFunctions.warpyAggreging) {
      ctx.body = 'Warpy aggreging functionality is disabled';
      ctx.status = 404;
      return;
    }

    const { contractId, limit, userId } = ctx.query;

    if (!contractId) {
      ctx.throw(422, 'Contract id must be provided.');
    }

    const rankingLimit = limit || DEFAULT_RANKING_LIMIT;

    try {
      const result = await getWarpyUserRanking(rankingLimit, userId, contractId);
      ctx.body = result;
      ctx.status = 200;
    } catch (e) {
      ctx.body = e.message;
      ctx.status = 500;
    }
  }
};
