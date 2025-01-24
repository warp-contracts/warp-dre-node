const { getWarpySeasonsSummaryUserActivity, getWarpySeasonsSummaryUserHistory } = require('../../db/nodeDb');
const { config } = require('../../config');

module.exports = {
  warpySeasonsSummary: async function (ctx) {
    if (!config.availableFunctions.warpyAggreging) {
      ctx.body = 'Warpy aggreging functionality is disabled';
      ctx.status = 404;
      return;
    }

    const { id, wallet } = ctx.query;

    if (!id && !wallet) {
      ctx.throw(422, 'User Id or wallet address must be provided.');
    }

    try {
      const activity = await getWarpySeasonsSummaryUserActivity({ id, wallet });
      const seasons = (await getWarpySeasonsSummaryUserHistory({ id, wallet })).reduce(
        (a, v) => ({ ...a, [v.row_seq]: v.season }),
        {}
      );
      ctx.body = {
        ...activity,
        seasons
      };
      ctx.status = 200;
    } catch (e) {
      ctx.body = e.message;
      ctx.status = 500;
    }
  }
};
