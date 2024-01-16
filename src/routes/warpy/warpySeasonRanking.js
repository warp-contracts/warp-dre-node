const { getSeasonRanking } = require('../../db/nodeDb');
const { config } = require('../../config');

const MAX_RANKING_RECORDS_PER_PAGE = 15;

module.exports = {
  warpySeasonRanking: async function (ctx) {
    if (!config.availableFunctions.warpyAggreging) {
      ctx.body = 'Warpy aggreging functionality is disabled';
      ctx.status = 404;
      return;
    }

    const { contractId, seasonName, page, limit } = ctx.query;

    if (!contractId) {
      ctx.throw(422, 'Contract id must be provided.');
    }

    if (!seasonName) {
      ctx.throw(422, 'Season name must be provided.');
    }

    const parsedPage = page ? parseInt(page) : 1;
    const parsedLimit = limit ? Math.min(parseInt(limit), MAX_RANKING_RECORDS_PER_PAGE) : MAX_RANKING_RECORDS_PER_PAGE;
    const offset = parsedPage ? (parsedPage - 1) * parsedLimit : 0;

    try {
      const result = await getSeasonRanking(contractId, seasonName, parsedLimit, offset);
      ctx.body = {
        paging: {
          limit: parsedLimit,
          items: result?.rows?.length,
          page: parsedPage
        },
        ranking: result
      };
      ctx.status = 200;
    } catch (e) {
      ctx.body = e.message;
      ctx.status = 500;
    }
  }
};
