/* eslint-disable */
require('dotenv').config();
const { warp, pgClient } = require('../warp');
const { LoggerFactory } = require("warp-contracts");

LoggerFactory.INST.logLevel('error');
LoggerFactory.INST.logLevel('debug', 'HandlerBasedContract');
LoggerFactory.INST.logLevel('debug', 'WarpGatewayInteractionsLoader');
LoggerFactory.INST.logLevel('debug', 'CacheableStateEvaluator');

const TX_ID = "p5OI99-BaY4QbZts266T7EDwofZqs-wVuYJmMCS0SUU"
const SK = '000001324955,1702907373366,7807f7e213982bccf8279cb764d25702c810d0e635b16bf3efc3bae3d8501381';

async function main() {
  try {
    await pgClient.open();
    const contract = warp.contract(TX_ID);
    await contract.readStateBatch(1, SK);
  } catch (e) {
    console.error(e);
  } finally {
    await pgClient.close();
  }
}


main().catch((e) => console.error(e));
