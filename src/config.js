require('dotenv').config();
const fs = require('fs');
const Arweave = require('arweave');
const pjson = require('../package.json');
const validate = require('./configValidator');
const logger = require('./logger')('config');

const nodeJwk = readNodeJwk();
const arweave = getArweave();
let warpSdkConfig = {
  'warp-contracts': pjson.dependencies['warp-contracts'],
  'warp-contracts-lmdb': pjson.dependencies['warp-contracts-lmdb'],
  'warp-contracts-sqlite': pjson.dependencies['warp-contracts-sqlite'],
  'warp-contracts-evaluation-progress-plugin': pjson.dependencies['warp-contracts-evaluation-progress-plugin'],
  'warp-contracts-plugin-nlp': pjson.dependencies['warp-contracts-plugin-nlp'],
  'warp-contracts-plugin-ethers': pjson.dependencies['warp-contracts-plugin-ethers'],
  'warp-contracts-plugin-signature': pjson.dependencies['warp-contracts-plugin-signature'],
  'warp-contracts-plugin-blacklist': pjson.dependencies['warp-contracts-plugin-blacklist'],
  'warp-contracts-plugin-vm2': pjson.dependencies['warp-contracts-plugin-vm2'],
  'warp-contracts-plugin-vrf': pjson.dependencies['warp-contracts-plugin-vrf'],
  '@othent/warp-contracts-plugin-jwt-verify': pjson.dependencies['@othent/warp-contracts-plugin-jwt-verify']
};
const evaluationOptions = {
  maxCallDepth: 666,
  maxInteractionEvaluationTimeSeconds: 20000,
  allowBigInt: process.env.EVALUATION_ALLOWBIGINT === 'true',
  unsafeClient: process.env.EVALUATION_UNSAFECLIENT,
  internalWrites: process.env.EVALUATION_INTERNALWRITES === 'true',
  cacheEveryNInteractions: 2000,
  whitelistSources: [
    // https://docs.google.com/spreadsheets/d/1F9T1Vyk3geEsrU8wVSdsPj9drO48Ae9f2UpkuE0ralI/edit#gid=0
    "Of9pi--Gj7hCTawhgxOwbuWnFI1h24TTgO5pw8ENJNQ", // Atomic Asset
    "W78KEzU8vIODFHzwa9ab7SS7Pjchc7KenivCiwSHxBY", // STAMP
    "kP1Ed8AMvaaBrEFjatP4pSmiE_fsRrGS0EcBMQYYiyc", // STAMP-evolve
    "mGxosQexdvrvzYCshzBvj18Xh1QmZX16qFJBuh4qobo", // U
    "7qv5x9A0NgAlTdMnBc1H2HFvN-te0kzzuT9RNt_66g8", // UCM contract old
    "eIAyBgHH-H7Qzw9fj7Austj30QKPQn27eaakvpOUSR8", // Facts
    "Of9pi--Gj7hCTawhgxOwbuWnFI1h24TTgO5pw8ENJNQ", // Pages
    "ovWCp0xKuHtq-bADXbtiNr6umwb_AE73kVZWtfHlX3w", // VouchDAO
    "1hDZBRSptTNgnACuO9qGHLbaOfnAcMBKCHcHPRhMWUY", // VouchDAO-evolve
    "LBcYEl2zwKDApj1Cow1_BYyiicxVV7OCZTexsjk6mB4", // UCM contract new
    "dRTFmLwJ3cNqdNvFK4yUvwc13CrJtFOmLymLxL4HWOE", // UCM contract evolve
    "yXPm9-9VyxH9otGf7xim0EJsnt21IJN8qJjanFTC_kc", // UCM contract evolve
    "qOd7mNAJdju9PxtsRJbel4Zu3xYgEwUbxW8U14czjD8", // UCM contract evolve
    "0GOnb0o9c232d6SXF_HXHbGzfIdiYeos7U5jobOSZ_c", // UCM contract evolve
    "8kPgNMm7dZUVk93T7wq05otEy1oDNqZhyD3L7WrcMTY", // UCM contract evolve
    "yDAppVePqGU1qcRnxdk-AShpIJ0RHCZixOMXtJTgm4Y", // UCM contract evolve
    "h9v17KHV4SXwdW2-JHU6a23f6R0YtbXZJJht8LfP8QM", // FAIR
  ]
};

function getGwPubSubConfig() {
  const conf = {
    port: process.env.GW_PORT ? parseInt(process.env.GW_PORT) : process.env.GW_PORT,
    host: process.env.GW_HOST,
    username: process.env.GW_USERNAME,
    password: process.env.GW_PASSWORD,
    enableOfflineQueue: process.env.GW_ENABLE_OFFLINE_QUEUE === 'true',
    lazyConnect: process.env.GW_LAZY_CONNECT === 'true'
  };
  if (process.env.GW_TLS === 'true') {
    if (process.env.GW_TLS_CA_CERT) {
      conf.tls = {
        ca: [process.env.GW_TLS_CA_CERT],
        checkServerIdentity: () => {
          return null;
        }
      };
    } else {
      conf.tls = true;
    }
  } else {
    conf.tls = false;
  }
  return conf;
}

const config = {
  env: process.env.ENV,
  dreName: process.env.MY_NAME_IS,
  gwUrl: readGwUrl(),
  streamr: {
    id: process.env.STREAMR_STREAM_ID,
    host: process.env.STREAMR_STREAM_HOST,
    port: parseInt(process.env.STREAMR_STREAM_PORT)
  },
  arweave,
  gwPubSubConfig: getGwPubSubConfig(),
  bullMqConnection: {
    port: process.env.BULLMQ_PORT ? parseInt(process.env.BULLMQ_PORT) : process.env.BULLMQ_PORT,
    host: process.env.BULLMQ_HOST,
    username: process.env.BULLMQ_USERNAME,
    password: process.env.BULLMQ_PASSWORD,
    tls: process.env.BULLMQ_TLS === 'true',
    enableOfflineQueue: process.env.BULLMQ_ENABLE_OFFLINE_QUEUE === 'true',
    lazyConnect: process.env.BULLMQ_LAZY_CONNECT === 'true'
  },
  appSync: {
    key: process.env.APPSYNC_KEY,
    publishState: process.env.APPSYNC_PUBLISH_STATE === 'true'
  },
  pubsub: {
    type: process.env.PUBSUB_TYPE
  },
  nodeJwk,
  evaluationOptions,
  warpSdkConfig,
  nodeManifest: getNodeManifest(),
  availableFunctions: {
    viewState: process.env.FUNC_VIEW_STATE === 'true'
  },
  workersConfig: {
    register: parseInt(process.env.WORKERS_REGISTER),
    update: parseInt(process.env.WORKERS_UPDATE),
    jobIdRefreshSeconds: parseInt(process.env.WORKERS_JOB_ID_REFRESH_SECONDS),
    maxFailures: parseInt(process.env.WORKERS_MAX_FAILURES),
    maxStateSizeB: parseInt(process.env.WORKERS_MAX_STATESIZE)
  }
};

validate(config);

function getArweave() {
  return Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https',
    timeout: 60000,
    logging: false
  });
}

function readNodeJwk() {
  if (!process.env.NODE_JWK_KEY) throw new Error('NODE_JWK_KEY is required');
  return JSON.parse(process.env.NODE_JWK_KEY);
}
function readGwUrl() {
  if (!process.env.WARP_GW_URL) throw new Error('Gateway URL is required');
  return process.env.WARP_GW_URL;
}

async function getNodeManifest() {
  return {
    gitCommitHash: getGitCommitHash(),
    warpSdkConfig,
    evaluationOptions,
    owner: nodeJwk.n,
    walletAddress: await arweave.wallets.ownerToAddress(nodeJwk.n)
  };
}

function getGitCommitHash() {
  let hash = '';
  if (fs.existsSync('./GIT_HASH')) {
    hash = fs.readFileSync('./GIT_HASH').toString().trim();
  } else if (fs.existsSync('.git')) {
    hash = require('child_process').execSync('git rev-parse HEAD').toString().trim();
  } else {
    throw new Error("Can't read git commit hash.");
  }
  return hash;
}

async function logConfig(config) {
  const nodeManifest = await config.nodeManifest;
  logger.info('---------');
  logger.info('Node configuration');
  logger.info('---------');
  logger.info('Environment', config.env);
  logger.info('Name', config.dreName);
  logger.info('---------');
  logger.info('Arweave public address', nodeManifest.walletAddress);
  logger.info('gitCommitHash', nodeManifest.gitCommitHash);
  logger.info('---------');
  logger.info('--- gwPubSubConfig');
  logger.info('--- host', config.gwPubSubConfig.host);
  logger.info('--- port', config.gwPubSubConfig.port);
  logger.info('--- tls', config.gwPubSubConfig.tls);
  logger.info('--- lazyConnect', config.gwPubSubConfig.lazyConnect);
  logger.info('--- enableOfflineQueue', config.gwPubSubConfig.enableOfflineQueue);
  logger.info('--- /gwPubSubConfig');
  logger.info('---------');
  logger.info('--- bullMqConnection');
  logger.info('--- port', config.bullMqConnection.port);
  logger.info('--- host', config.bullMqConnection.host);
  logger.info('--- username', config.bullMqConnection.username);
  logger.info('--- tls', config.bullMqConnection.tls);
  logger.info('--- enableOfflineQueue', config.bullMqConnection.enableOfflineQueue);
  logger.info('--- lazyConnect', config.bullMqConnection.lazyConnect);
  logger.info('--- /bullMqConnection');
  logger.info('---------');
  logger.info('evaluationOptions', config.evaluationOptions);
  logger.info('workersConfig', config.workersConfig);
  logger.info('streamr', config.streamr);
}

module.exports.config = config;
module.exports.logConfig = async () => await logConfig(config);
