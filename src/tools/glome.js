import { defaultCacheOptions, WarpFactory } from "warp-contracts";

const useArweaveGw = true;
const warp = WarpFactory.forMainnet(defaultCacheOptions, useArweaveGw);

// put the contract ids that you want to evaluate the state for
const contractIds = [];

setInterval(async () => {
  for (const contractTxId of contractIds) {
    await warp.contract(contractTxId).readState();
  }
}, 10000);