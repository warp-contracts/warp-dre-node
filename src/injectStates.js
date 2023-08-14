require('dotenv').config();
const warp = require('./warp');
const { config, logConfig } = require("./config");
const { LoggerFactory } = require("warp-contracts");

/**
 https://discord.com/channels/1103577987007397919/1125470037801717932/1140561729928040458
 To sum up, I will:

 1. add the W78KEzU8vIODFHzwa9ab7SS7Pjchc7KenivCiwSHxBY to the whitelist and 'inject' the state
 of the STAMP contract - https://sonar.warp.cc/#/app/contract/TlqASNDLA1Uh8yFiH-BzR_1FDag4s735F3PoUFEv2Mo?network=mainnet

 2. add the ovWCp0xKuHtq-bADXbtiNr6umwb_AE73kVZWtfHlX3w to the whitelist and 'inject' the state of the VouchDAO
 contract (there are 3 contracts with this srcTxId, but I assume that https://sonar.warp.cc/#/app/contract/_z0ch80z_daDUFqC9jHjfOL8nekJcok4ZRkE_UesYsk?network=mainnet is the 'real' one)
 */


/**
 1. First run this script
 2. Then restart the 'syncer' so that it can grab the updated whitelist array.

 Running in different order will fuck things up.
 */
async function main() {

  LoggerFactory.INST.logLevel('error', "WarpGatewayInteractionsLoader");
  LoggerFactory.INST.logLevel('error', "ContractHandler");
  LoggerFactory.INST.logLevel('info', "HandlerBasedContract");
  LoggerFactory.INST.logLevel('error', "DefaultStateEvaluator");

  await logConfig();

  const blockHeight = 1240554;

  console.log("injecting STAMP contract");
  const stampContract = warp
    .contract('TlqASNDLA1Uh8yFiH-BzR_1FDag4s735F3PoUFEv2Mo')
    .setEvaluationOptions(config.evaluationOptions);
  await stampContract.readState(blockHeight);
  console.log("STAMP injected");

  console.log("injecting VouchDAO contract");
  const vouchDaoContract = warp
    .contract("_z0ch80z_daDUFqC9jHjfOL8nekJcok4ZRkE_UesYsk")
    .setEvaluationOptions(config.evaluationOptions);
  await vouchDaoContract.readState(blockHeight);
  console.log("VouchDAO injected");

}

main().finally(() => console.log("done"));
