const { getWarpySeasonRanking } = require('../../db/nodeDb');
const { config } = require('../../config');

const DEFAULT_RANKING_LIMIT = 15;

module.exports = {
  warpySeasonRanking: async function (ctx) {
    if (!config.availableFunctions.warpyAggreging) {
      ctx.body = 'Warpy aggreging functionality is disabled';
      ctx.status = 404;
      return;
    }

    const { limit, address, contractId, from } = ctx.query;

    if (!contractId) {
      ctx.throw(422, 'Contract id must be provided.');
    }

    if (!from) {
      ctx.throw(422, 'From parameter must be provided.');
    }

    const rankingLimit = limit || DEFAULT_RANKING_LIMIT;

    try {
      const result = await getWarpySeasonRanking(rankingLimit, address, contractId, from);
      ctx.body = result;
      ctx.status = 200;
    } catch (e) {
      ctx.body = e.message;
      ctx.status = 500;
    }
  }
};
