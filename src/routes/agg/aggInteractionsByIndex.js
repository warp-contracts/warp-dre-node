const { drePool } = require('../../db/nodeDb');
const MAX_INTERACTIONS_PER_PAGE = 1000;

module.exports = {
  interactions: async (ctx) => {
    const { page, limit, ownerAddress, indexes, contractTxId } = ctx.query;

    const parsedPage = page ? parseInt(page) : 1;
    const parsedLimit = limit ? Math.min(parseInt(limit), MAX_INTERACTIONS_PER_PAGE) : MAX_INTERACTIONS_PER_PAGE;
    const offset = parsedPage ? (parsedPage - 1) * parsedLimit : 0;

    const bindings = [];
    bindings.push(parsedLimit);
    bindings.push(offset);

    try {
      const parsedIndexes = parseIndexes(indexes);
      let indexQuery = `AND $3 IN (tag_index_0, tag_index_1, tag_index_2, tag_index_3, tag_index_4)`;
      bindings.push(parsedIndexes.shift());

      let i = bindings.length;
      for (const index of parsedIndexes) {
        bindings.push(index);
        indexQuery += `AND $${++i} IN (tag_index_0, tag_index_1, tag_index_2, tag_index_3, tag_index_4)`;
      }

      if (ownerAddress) {
        bindings.push(ownerAddress);
      }
      if (contractTxId) {
        bindings.push(contractTxId);
      }

      const query = `
        SELECT id, contract_tx_id, block_height, owner_address, tag_index_0, tag_index_1, tag_index_2, tag_index_3, tag_index_4 
        FROM dre.interactions
        WHERE true
        ${ownerAddress ? ` AND owner_address = $${++i}` : ''}
        ${contractTxId ? ` AND contract_tx_id = $${++i}` : ''}
        ${indexQuery}
        ORDER BY block_height DESC
        LIMIT $1 OFFSET $2
    `;
      console.log(query);
      console.log(bindings);
      const result = await drePool.query(query, bindings);

      ctx.body = {
        paging: {
          limit: parsedLimit,
          items: result?.rows?.length,
          page: parsedPage
        },
        interactions: result?.rows
      };

      ctx.status = 200;
    } catch (e) {
      ctx.body = e.message;
      ctx.status = 500;
    }
  }
};

function parseIndexes(indexes) {
  if (!indexes) {
    throw Error('Please provide at least one index');
  }

  const parsedIndexes = indexes.split(';');

  if (parsedIndexes.length === 0) {
    throw Error('Please provide at least one index');
  }

  return parsedIndexes;
}
