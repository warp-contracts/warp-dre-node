const { LoggerFactory } = require('warp-contracts');
const { upsertBalances, balancesLastSortKey, updateWalletAddress } = require('../../db/aggDbUpdates');
const { getWarpyLastUserAddress } = require('../../db/nodeDb');

LoggerFactory.INST.logLevel('none');
LoggerFactory.INST.logLevel('debug', 'listener');

const logger = LoggerFactory.INST.create('listener');

module.exports = {
  onNewState: async function (data) {
    const { contractTxId, result } = data;
    const contractState = result.cachedValue.state;
    const lastSK = await balancesLastSortKey(contractTxId);

    if (result.sortKey.localeCompare(lastSK)) {
      await changeWalletAddressIfNeeded(data);
      await upsertBalances(contractTxId, result.sortKey, contractState);
    } else {
      logger.warn('Received state with older or equal sort key', {
        contract: contractTxId,
        received: result.sortKey,
        latest: lastSK
      });
    }
  }
};

async function changeWalletAddressIfNeeded(data) {
  const input = getParsedInput(data);
  if (!input) {
    return;
  } else if (shouldChangeWalletAddress(input)) {
    const { id, address } = getUserInfo(input);
    logger.debug(`New 'changeWallet' interaction, update required. Id: ${id}, new address: ${address}.`);
    if (id && address) {
      const oldAddress = (await getWarpyLastUserAddress(id))[0]?.value;
      if (oldAddress) {
        await updateWalletAddress(oldAddress, address);
        logger.info(`Wallet address updated. Old address: ${oldAddress}, new address: ${address}`);
      } else {
        logger.debug(`No data found in balances for user: ${id}.`);
      }
    }
  }
}
function shouldChangeWalletAddress(input) {
  const interactionName = input.function;
  if (interactionName == 'changeWallet') {
    return true;
  } else {
    return false;
  }
}

function getUserInfo(input) {
  return { address: input.address, id: input.id };
}

function getParsedInput(data) {
  const input = data?.interactions[0]?.tags?.find((t) => t.name == 'Input')?.value;
  if (!input) {
    logger.info(`Could not get input tag.`);
    return;
  }
  try {
    return JSON.parse(input);
  } catch (e) {
    logger.warn(`Could not parse input value. ${JSON.stringify(e)}. `);
    return;
  }
}
