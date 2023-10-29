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
  'warp-contracts-postgres': pjson.dependencies['warp-contracts-postgres'],
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
  whitelistSources: JSON.parse(process.env.EVALUATION_WHITELIST_SOURCES),
  blacklistedContracts: JSON.parse(process.env.EVALUATION_BLACKLISTED_CONTRACTS)
};

function getGwPubSubConfig() {
  const conf = {
    port: process.env.GW_PORT ? parseInt(process.env.GW_PORT) : process.env.GW_PORT,
    host: process.env.GW_HOST,
    username: process.env.GW_USERNAME,
    password: process.env.GW_PASSWORD,
    enableOfflineQueue: process.env.GW_ENABLE_OFFLINE_QUEUE === 'true',
    lazyConnect: process.env.GW_LAZY_CONNECT === 'true',
    publishState: process.env.REDIS_PUBLISH_STATE === 'true'
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
    lazyConnect: process.env.BULLMQ_LAZY_CONNECT === 'true',
    enableReadyCheck: false
  },
  appSync: {
    key: process.env.APPSYNC_KEY,
    publishState: process.env.APPSYNC_PUBLISH_STATE === 'true',
    stream: process.env.APPSYNC_STREAM
  },
  pubsub: {
    type: process.env.PUBSUB_TYPE
  },
  nodeJwk,
  evaluationOptions,
  warpSdkConfig,
  nodeManifest: getNodeManifest(),
  availableFunctions: {
    viewState: process.env.FUNC_VIEW_STATE === 'true',
    contractEvents: process.env.PROCESS_CONTRACT_EVENTS === 'true',
    warpyAggreging: process.env.WARPY_AGGREGATING === 'true'
  },
  workersConfig: {
    register: parseInt(process.env.WORKERS_REGISTER),
    update: parseInt(process.env.WORKERS_UPDATE),
    postEval: parseInt(process.env.WORKERS_POST_EVAL),
    maintenance: parseInt(process.env.WORKERS_MAINTENANCE),
    maintenanceWindow: parseInt(process.env.WORKERS_MAINTENANCE_WINDOW),
    jobIdRefreshSeconds: parseInt(process.env.WORKERS_JOB_ID_REFRESH_SECONDS),
    maxFailures: parseInt(process.env.WORKERS_MAX_FAILURES),
    maxStateSizeB: parseInt(process.env.WORKERS_MAX_STATESIZE)
  },
  syncWindowSeconds: JSON.parse(process.env.SYNC_WINDOW_SECONDS),
  firstInteractionTimestamp: parseInt(process.env.FIRST_INTERACTION_TIMESTAMP),
  pollResponseLengthLimit: process.env.POLL_RESPONSE_LENGTH_LIMIT
    ? parseInt(process.env.POLL_RESPONSE_LENGTH_LIMIT)
    : 15000,
  pollLoadInteractionsUrl: readLoadInteractionsUrl(),
  pollForkProcess: process.env.POLL_FORK_PROCESS === 'true',
  whitelistMode: JSON.parse(process.env.EVALUATION_WHITELIST_SOURCES).length > 0,
  updateMode: process.env.UPDATE_MODE || 'poll'
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
function readLoadInteractionsUrl() {
  if (process.env.UPDATE_MODE === 'poll') {
    if (!process.env.POLL_INTERACTIONS_URL) {
      throw new Error('Poll mode requires load interactions url');
    }
    return process.env.POLL_INTERACTIONS_URL;
  }
  return '';
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
  logger.info('syncWindowSeconds', config.syncWindowSeconds);
  logger.info('firstInteractionTimestamp', config.firstInteractionTimestamp);
  logger.info('pollResponseLengthLimit', config.pollResponseLengthLimit);
  logger.info('pollLoadInteractionsUrl', config.pollLoadInteractionsUrl);
  logger.info('pollForkProcess', config.pollForkProcess);
  logger.info('updateMode', config.updateMode);
}

module.exports.config = config;
module.exports.logConfig = async () => await logConfig(config);
