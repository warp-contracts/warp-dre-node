const fs = require("fs");
const path = require("path");
const Arweave = require("arweave");
const pjson = require('../package.json');

let gwPubSub = null;
let apiKeys = null;
let nodeJwk = null;
let arweave = null;
let warpSdk = null;
let nodeManifest = null;
let workersConfig = null;

const evaluationOptions = {
  useVM2: false,
  maxCallDepth: 5,
  maxInteractionEvaluationTimeSeconds: 10,
  allowBigInt: true,
  allowUnsafeClient: false,
  internalWrites: true,
};

module.exports = {
  getArweave: () => {
    if (arweave === null) {
      arweave = Arweave.init({
        host: "arweave.net",
        port: 443,
        protocol: "https",
        timeout: 60000,
        logging: false,
      });
    }
    return arweave;
  },

  readGwPubSubConfig: () => {
    if (gwPubSub === null) {
      gwPubSub = readConfig('gw-pubsub.json');
    }
    return gwPubSub;
  },

  readApiKeysConfig: () => {
    if (apiKeys === null) {
      apiKeys = readConfig('api-keys.json');
    }
    return apiKeys;
  },

  readNodeJwk: () => {
    if (nodeJwk === null) {
      nodeJwk = readConfig('node-jwk.json');
    }
    return nodeJwk;
  },

  getEvaluationOptions: () => {
    return evaluationOptions;
  },

  getWarpSdkConfig: () => {
    if (warpSdk == null) {
      warpSdk = {
        'warp-contracts': pjson.dependencies['warp-contracts'],
        'warp-contracts-lmdb': pjson.dependencies['warp-contracts-lmdb'],
        'warp-contracts-ivm-plugin': pjson.dependencies['warp-contracts-ivm-plugin'],
        'warp-contracts-evaluation-progress-plugin': pjson.dependencies['warp-contracts-evaluation-progress-plugin'],
      }
    }
    return warpSdk;
  },

  getNodeManifest: async () => {
    if (nodeManifest == null) {
      const jwk = module.exports.readNodeJwk();
      const address = await module.exports.getArweave().wallets.ownerToAddress(jwk.n);
      const gitCommitHash = require('child_process')
        .execSync('git rev-parse HEAD')
        .toString().trim();

      nodeManifest = {
        gitCommitHash: gitCommitHash,
        warpSdkConfig: module.exports.getWarpSdkConfig(),
        evaluationOptions: module.exports.getEvaluationOptions(),
        owner: jwk.n,
        walletAddress: address
      }
    }

    return nodeManifest;
  },

  readWorkersConfig: () => {
    if (workersConfig === null) {
      workersConfig = readConfig('workers.json');
    }
    return workersConfig;
  }
}

function readConfig(file) {
  const json = fs.readFileSync(path.join('.secrets', file), "utf-8");
  return JSON.parse(json);
}