const { getAllContractsIds } = require('../db/nodeDb');

module.exports = async (ctx) => {
  const { nodeDb } = ctx;

  const allContracts = await getAllContractsIds(nodeDb);

  try {
    ctx.body = {
      cachedContracts: allContracts.total,
      ids: allContracts.ids
    };
    ctx.status = 200;
  } catch (e) {
    ctx.body = e.message;
    ctx.status = 500;
  }
};
