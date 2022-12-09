const fs = require("fs");
const path = require("path");
const Arweave = require("arweave");
const pjson = require('../package.json');

let gwPubSub = null;
let bullMqRedisConfig = null;
let apiKeys = null;
let nodeJwk = null;
let arweave = null;
let warpSdk = null;
let nodeManifest = null;
let workersConfig = null;

const evaluationOptions = {
  useVM2: true,
  maxCallDepth: 5,
  maxInteractionEvaluationTimeSeconds: 10,
  allowBigInt: true,
  unsafeClient: 'skip',
  internalWrites: true,
};

function getGitCommitHash() {
  let hash = '';
  if (fs.existsSync('./GIT_HASH')) {
    hash = fs.readFileSync('./GIT_HASH').toString().trim();
  }
  else if (fs.existsSync('.git')) {
    hash = require('child_process')
        .execSync('git rev-parse HEAD')
        .toString().trim();
  } else {
    throw new Error('Can\'t read git commit hash.');
  }
  return hash;
}

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
      if (process.env.GW_HOST) {
        gwPubSub = {
          port: process.env.GW_PORT,
          host: process.env.GW_HOST,
          username: process.env.GW_USERNAME,
          password: process.env.GW_PASSWORD,
          tls: process.env.GW_TLS,
          enableOfflineQueue: process.env.GW_ENABLE_OFFLINE_QUEUE,
          lazyConnect: process.env.GW_LAZY_CONNECT,
        }
      } else {
        gwPubSub = readConfig('gw-pubsub.json');
      }
    }
    return gwPubSub;
  },

  readBullMqRedisConfig: () => {
    if (bullMqRedisConfig === null) {
      bullMqRedisConfig = {
        port: process.env.BULLMQ_PORT,
        host: process.env.BULLMQ_HOST,
        username: process.env.BULLMQ_USERNAME,
        password: process.env.BULLMQ_PASSWORD,
        tls: process.env.BULLMQ_TLS,
        enableOfflineQueue: process.env.BULLMQ_ENABLE_OFFLINE_QUEUE,
        lazyConnect: process.env.BULLMQ_LAZY_CONNECT,
      }
    }
    return bullMqRedisConfig
  },

  readApiKeysConfig: () => {
    if (apiKeys === null) {
      if (process.env.APPSYNC_KEY) {
        apiKeys = {
          appsync: process.env.APPSYNC_KEY
        }
      } else {
        apiKeys = readConfig('api-keys.json');
      }
    }
    return apiKeys;
  },

  readNodeJwk: () => {
    if (nodeJwk === null) {
      if (process.env.NODE_JWK_KEY) {
        nodeJwk = JSON.parse(process.env.NODE_JWK_KEY);
      } else {
        nodeJwk = readConfig('node-jwk.json');
      }
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
        'warp-contracts-evaluation-progress-plugin': pjson.dependencies['warp-contracts-evaluation-progress-plugin'],
        'warp-contracts-nlp-plugin': pjson.dependencies['warp-contracts-nlp-plugin'],
        'warp-contracts-plugin-ethers': pjson.dependencies['warp-contracts-plugin-ethers']
      }
    }
    return warpSdk;
  },

  getNodeManifest: async () => {
    if (nodeManifest == null) {
      const jwk = module.exports.readNodeJwk();
      const address = await module.exports.getArweave().wallets.ownerToAddress(jwk.n);
      const gitCommitHash = getGitCommitHash();

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
      if (process.env.WORKERS_REGISTER) {
        workersConfig = {
          register: process.env.WORKERS_REGISTER,
          update: process.env.WORKERS_UPDATE,
          jobIdRefreshSeconds: process.env.WORKERS_JOB_ID_REFRESH_SECONDS,
          maxFailures: process.env.WORKERS_MAX_FAILURES,
        }
      } else {
        workersConfig = readConfig('workers.json');
      }
    }
    return workersConfig;
  }
}

function readConfig(file) {
  const json = fs.readFileSync(path.join('.secrets', file), "utf-8");
  return JSON.parse(json);
}
