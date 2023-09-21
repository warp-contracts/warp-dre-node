const { getAllContractsIds, countAllContracts } = require('../db/nodeDb');

module.exports = async (ctx) => {
  const { nodeDb } = ctx;
  const showIds = ctx.query.ids === 'true';

  try {
    if (showIds) {
      const allContracts = await getAllContractsIds(nodeDb);
      ctx.body = {
        cachedContracts: allContracts.total,
        ids: allContracts.ids
      };
    } else {
      ctx.body = {
        cachedContracts: (await countAllContracts(nodeDb)).total
      };
    }

    ctx.status = 200;
  } catch (e) {
    ctx.body = e.message;
    ctx.status = 500;
  }
};
