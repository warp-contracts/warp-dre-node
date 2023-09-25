const logger = require('./../logger')('aggUpdates');
const { drePool } = require('./nodeDb');

module.exports = {
  upsertBalances: async function (contractTxId, sortKey, state) {
    const balances = state.balances;
    const ticker = state.ticker; // pst standard
    const symbol = state.symbol; // warp nft/erc standard
    const token_ticker = ticker ? ticker.trim() : symbol.trim();
    const name = state.name;

    if (!balances || (!ticker && !symbol)) {
      logger.error(`Contract ${contractTxId} is not compatible with token standard`);
      return;
    }
    const walletAddresses = Object.keys(balances);
    for (const walletAddress of walletAddresses) {
      const balance = balances[walletAddress] ? balances[walletAddress].toString() : null;
      await drePool.query(
        `
            INSERT INTO dre.balances(wallet_address, contract_tx_id, token_ticker, sort_key, token_name, balance)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (wallet_address, contract_tx_id) DO UPDATE SET wallet_address = excluded.wallet_address,
                                                                       contract_tx_id = excluded.contract_tx_id`,
        [walletAddress.trim(), contractTxId.trim(), token_ticker, sortKey, name?.trim(), balance]
      );
    }
  }
};

// export class AggregateDbUpdates {
//   logger = LoggerFactory.INST.create("DbUpdates");
//   #nodeDb;
//
//   constructor(db) {
//     nodeDb. = db;
//   }
//
//   async upsertState(
//     contractTxId,
//     sortKey,
//     state,
//     node,
//     signature,
//     manifest,
//     stateHash
//   ) {
//     logger.info("Upserting state", contractTxId);
//
//     await nodeDb.("states")
//       .insert({
//         contract_tx_id: contractTxId.trim(),
//         sort_key: sortKey,
//         state: state,
//         node: node,
//         signature: signature,
//         manifest: manifest,
//         state_hash: stateHash
//       })
//       .onConflict(["contract_tx_id"])
//       .merge();
//   }
//
//   async lastSortKey(contractTxId) {
//     const result = await nodeDb..raw(
//       `SELECT max(sort_key) as maxSortKey
//        FROM states
//        WHERE contract_tx_id = ?`,
//       [contractTxId]
//     );
//
//     if (!result || !result.length) {
//       return null;
//     }
//
//     return result[0].maxSortKey;
//   }
//
//   async upsertInteraction(
//     contractTxId,
//     id,
//     ownerAddress,
//     blockHeight,
//     indexes
//   ) {
//     logger.info("Upserting interactions", contractTxId);
//
//     const effectiveIndexesCount = Math.min(TAGS_LIMIT, indexes.length);
//     const indexesInsert = {};
//
//     for (let i = 0; i < effectiveIndexesCount; i++) {
//       indexesInsert[`tag_index_${i}`] = indexes[i];
//     }
//
//     await nodeDb.("interactions").insert({
//       contract_tx_id: contractTxId.trim(),
//       id: id,
//       owner_address: ownerAddress,
//       block_height: blockHeight,
//       ...indexesInsert
//     });
//   }
//
//   async upsertDeployment(contractTxId, indexes) {
//     logger.info("Upserting deployment", contractTxId);
//
//     const effectiveIndexesCount = Math.min(TAGS_LIMIT, indexes.length);
//     const indexesInsert = {};
//
//     for (let i = 0; i < effectiveIndexesCount; i++) {
//       indexesInsert[`tag_index_${i}`] = indexes[i];
//     }
//
//     await nodeDb.("deployments").insert({
//       contract_tx_id: contractTxId.trim(),
//       ...indexesInsert
//     });
//   }
//
// }
