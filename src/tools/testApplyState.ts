/* eslint-disable */

import { defaultCacheOptions, LoggerFactory, WarpFactory } from "warp-contracts";
const { LmdbCache } = require('warp-contracts-lmdb');
const { NlpExtension } = require('warp-contracts-plugin-nlp');
const { EvaluationProgressPlugin } = require('warp-contracts-evaluation-progress-plugin');
const { EventEmitter } = require('node:events');
// const { events } = require('.../db/nodeDb');
const { EthersExtension } = require('warp-contracts-plugin-ethers');
const { EvmSignatureVerificationServerPlugin } = require('warp-contracts-plugin-signature/server');

LoggerFactory.INST.logLevel('debug');
// LoggerFactory.INST.logLevel('none', 'DefaultStateEvaluator');
const logger = LoggerFactory.INST.create('ivm-example');

async function main() {
  const eventEmitter = new EventEmitter();
  eventEmitter.on('progress-notification', (data: any) => {
    // events.progress(data.contractTxId, data.message);
  });

  const contractTxId = 'OrO8n453N6bx921wtsEs-0OCImBLCItNU5oSbFKlFuU';

  const warp = WarpFactory.forMainnet()
    .useStateCache(
      new LmdbCache(
        {
          ...defaultCacheOptions,
          dbLocation: `./cache/warp/lmdb/state`
        },
        {
          minEntriesPerContract: 5000000,
          maxEntriesPerContract: 5000000
        }
      )
    )
    .useContractCache(
      new LmdbCache(
        {
          ...defaultCacheOptions,
          dbLocation: `./cache/warp/lmdb/contract`
        },
        {
          minEntriesPerContract: 5000000,
          maxEntriesPerContract: 5000000
        }
      ),
      new LmdbCache(
        {
          ...defaultCacheOptions,
          dbLocation: `./cache/warp/lmdb/source`
        },
        {
          minEntriesPerContract: 5000000,
          maxEntriesPerContract: 5000000
        }
      )
    )
    .use(new EvaluationProgressPlugin(eventEmitter, 500))
    .use(new NlpExtension())
    .use(new EvmSignatureVerificationServerPlugin())
    .use(new EthersExtension());
  // const warp = WarpFactory
  //   .forMainnet({ ...defaultCacheOptions, inMemory: true });
  const contract = warp
    .contract("OrO8n453N6bx921wtsEs-0OCImBLCItNU5oSbFKlFuU")

  const cacheResult = await contract
    .setEvaluationOptions({
      allowBigInt: true,
      internalWrites: true,
      unsafeClient: "allow",
    })
    .readState('000000910492,1649597937854,be3250a325c520e72f6301ea7eee0e554d54b3c74778c11a7af72dd5988049dd');

  const result2 = await contract.readStateFor('000000910492,1649597937854,be3250a325c520e72f6301ea7eee0e554d54b3c74778c11a7af72dd5988049dd',
    [{
      "id": "YOIBrNDTwRoZRmlfTZhyjg7ygdjzqV9bZb6pZmXQzeE",
      "fee": {
        "winston": "62411260"
      },
      "tags": [
        {
          "name": "App-Name",
          "value": "SmartWeaveAction"
        },
        {
          "name": "App-Version",
          "value": "0.3.0"
        },
        {
          "name": "SDK",
          "value": "RedStone"
        },
        {
          "name": "Contract",
          "value": "OrO8n453N6bx921wtsEs-0OCImBLCItNU5oSbFKlFuU"
        },
        {
          "name": "Input",
          "value": "{\"function\":\"registerProvider\",\"data\":{\"provider\":{\"adminsPool\":[\"saRRtnBNekVmBvx_3vNqQ2n2zhG7v3KCGsHbKioS5Sc\"],\"profile\":{\"name\":\"RedStone Avalanche prod 5\",\"description\":\"Most popular tokens from the Avalanche ecosystem\",\"url\":\"https://redstone.finance/\",\"imgUrl\":\"https://redstone.finance/assets/img/redstone-logo-full.svg\"},\"manifests\":[{\"changeMessage\":\"initial manifest\",\"lockedHours\":0,\"manifestTxId\":\"y7ppr6m9MuP65Fiivd9CX84qcPLoYBMifUrFK3jXw2k\"}]}}}"
        }
      ],
      "block": {
        "id": "fZsSqrjTNX3IDVkDuCVX512ZnJ3HU9jjZ9Dg_7b471BWeT1sJ83c7RDMWCWd-1Mt",
        "height": 910563,
        "timestamp": 1649606400
      },
      "owner": {
        "address": "saRRtnBNekVmBvx_3vNqQ2n2zhG7v3KCGsHbKioS5Sc"
      },
      "source": "redstone-sequencer",
      "sortKey": "000000910564,1649606636671,94a0b260d85920f86100fb200c60307ea0b30b70b4d2970049a567f53cd6f9c0",
      "quantity": {
        "winston": "0"
      },
      "recipient": ""
    } as any]
  )
  // console.log(cacheResult.cachedValue.validity)

  console.log(objectsEqual(cacheResult.cachedValue.validity, result2.cachedValue.validity));

}

const objectsEqual = (o1: any, o2: any) => {
  let out = true
  for (var p in o1) {
    if (o1.hasOwnProperty(p)) {
      if (o1[p] !== o2[p]) {
        console.log("1", p)
        out = false
      }
    }
  }
  for (var p in o2) {
    if (o2.hasOwnProperty(p)) {
      if (o1[p] !== o2[p]) {
        console.log("2", p)
        out = false
      }
    }
  }
  return out;
};

main().catch((e) => console.error(e));