const { Queue, Worker, MetricsTime, QueueEvents } = require('bullmq');
const path = require('path');
const Redis = require('ioredis');
const Koa = require('koa');
const cors = require('@koa/cors');
const bodyParser = require('koa-bodyparser');
const compress = require('koa-compress');
const zlib = require('zlib');
const router = require('./router');
const { config, logConfig } = require('./config');
const {
  createNodeDbTables,
  insertFailure,
  upsertBlacklist,
  getFailures,
  connect,
  events,
  hasContract,
  connectEvents,
  createNodeDbEventsTables,
  doBlacklist,
  lastSyncTimestamp
} = require('./db/nodeDb');

const logger = require('./logger')('listener');
const exitHook = require('async-exit-hook');
const warp = require('./warp');
const { execSync } = require('child_process');
const fs = require('fs');
const { zarContract, uContract, ucmTag } = require('./constants');
const pollGateway = require('./workers/pollGateway');
const { storeAndPublish } = require("./workers/common");
const { LoggerFactory } = require("warp-contracts");

let isTestInstance = config.env === 'test';
let port = 8080;

const registerQueueName = 'register';

let updateWorker;
let registerWorker;

let nodeDb;
let nodeDbEvents;

const nonBlacklistErrors = [
  'Unable to retrieve transactions. Warp gateway responded with status',
  'Trying to use testnet contract in a non-testnet env. Use the "forTestnet" factory method.'
];

async function runListener() {
  logger.info('🚀🚀🚀 Starting execution node');
  await logConfig();

  nodeDb = connect();
  nodeDbEvents = connectEvents();

  await createNodeDbTables(nodeDb);
  await createNodeDbEventsTables(nodeDbEvents);

  if (fs.existsSync('./src/db/migrations/stateDb')) {
    execSync('npx knex --knexfile=knexConfigStateDb.js migrate:latest');
  }

  if (fs.existsSync('./src/db/migrations/eventsDb')) {
    execSync('npx knex --knexfile=knexConfigEventsDb.js migrate:latest');
  }

  const registerQueue = new Queue(registerQueueName, {
    connection: config.bullMqConnection,
    defaultJobOptions: {
      removeOnComplete: {
        age: 3600
      },
      removeOnFail: true
    }
  });

  const registerEvents = new QueueEvents(registerQueueName, { connection: config.bullMqConnection });

  async function onFailedJob(contractTxId, jobId, failedReason) {
    await insertFailure(nodeDb, {
      contract_tx_id: contractTxId,
      evaluation_options: config.evaluationOptions,
      sdk_config: config.warpSdkConfig,
      job_id: jobId,
      failure: failedReason
    });
    if (failedReason.includes('[MaxStateSizeError]')) {
      await doBlacklist(nodeDb, contractTxId, config.workersConfig.maxFailures);
    } else {
      if (![zarContract, uContract].includes(contractTxId)) {
        if (!nonBlacklistErrors.some((e) => failedReason.includes(e))) {
          await upsertBlacklist(nodeDb, contractTxId);
        }
      }
    }
    events.failure(nodeDbEvents, contractTxId, failedReason);
  }

  registerEvents.on('failed', async ({ jobId, failedReason }) => {
    logger.error('Register job failed', { jobId, failedReason });
    const contractTxId = jobId;

    await onFailedJob(contractTxId, jobId, failedReason);
  });
  registerEvents.on('added', async ({ jobId }) => {
    logger.info('Job added to register queue', jobId);
    events.register(nodeDbEvents, jobId);
  });
  registerEvents.on('completed', async ({ jobId }) => {
    logger.info('Register job completed', jobId);
    events.evaluated(nodeDbEvents, jobId);
  });

  await clearQueue(registerQueue);

  const registerProcessor = path.join(__dirname, 'workers', 'registerProcessor');
  registerWorker = new Worker(registerQueueName, registerProcessor, {
    concurrency: config.workersConfig.register,
    connection: config.bullMqConnection,
    metrics: {
      maxDataPoints: MetricsTime.ONE_WEEK
    }
  });

  const app = new Koa();
  app
    .use(corsConfig())
    .use(compress(compressionSettings))
    .use(bodyParser())
    .use(router.routes())
    .use(router.allowedMethods())
    .use(async (ctx, next) => {
      await next();
      ctx.redirect('/status');
    });
  app.context.registerQueue = registerQueue;
  app.context.nodeDb = nodeDb;
  app.context.nodeDbEvents = nodeDbEvents;
  app.listen(port);


  const initialSyncHeight = 1233972;

  // the min timestamp of an interaction with sortKey starting one block after 'initialSyncHeight',
  // e.g. (assuming initialSyncHeight = 1233790):
  // select min(sync_timestamp) from interactions where sort_key like '000001233791,%';
  const initialSyncTimestamp = 1691169770730;

  const lastTimestamp = await lastSyncTimestamp(nodeDb);
  logger.info('Last sync timestamp result', lastTimestamp);
  if (!lastTimestamp) {
    logger.info("Initial U read at height", initialSyncHeight);
    await initialContractEval(uContract, initialSyncHeight);

    logger.info("Initial non-U contracts read at timestamp", initialSyncTimestamp);
    await pollGateway(
      nodeDb,
      config.evaluationOptions.whitelistSources.filter(s => s != "mGxosQexdvrvzYCshzBvj18Xh1QmZX16qFJBuh4qobo"),
      0,
      0,
      initialSyncTimestamp);
  }
  const startTimestamp = lastTimestamp
    ? lastTimestamp
    : initialSyncTimestamp;

  const windowSizeMs = 25 * 1000;
  await pollGateway(nodeDb, config.evaluationOptions.whitelistSources, startTimestamp, windowSizeMs);

  const onMessage = async (data) => await processContractData(data, nodeDb, nodeDbEvents, registerQueue);
  await subscribeToGatewayNotifications(onMessage)

  logger.info(`Listening on port ${port}`);
  async function initialContractEval(contractTxId, height) {
    logger.info("Initial evaluation", contractTxId);
    const contract = warp.contract(contractTxId).setEvaluationOptions(config.evaluationOptions);
    const result = await contract.readState(height);
    await storeAndPublish(logger, false, contractTxId, result);
  }
}


runListener().catch((e) => {
  logger.error(e);
});

async function processContractData(msgObj, nodeDb, nodeDbEvents, registerQueue) {
  logger.info(`Received '${msgObj.contractTxId}'`);

  let validationMessage = null;
  if (!isTxIdValid(msgObj.contractTxId)) {
    validationMessage = 'Invalid tx id format';
  }

  if (!msgObj.initialState) {
    validationMessage = 'Only register messages are allowed';
  }

  if (msgObj.test && !isTestInstance) {
    validationMessage = 'Skipping test instance message';
  }

  if (!msgObj.test && isTestInstance) {
    validationMessage = 'Skipping non-test instance message';
  }

  if (validationMessage == null) {
    const contractFailures = await getFailures(nodeDb, msgObj.contractTxId);
    if (Number.isInteger(contractFailures) && contractFailures > config.workersConfig.maxFailures - 1) {
      validationMessage = `Contract blacklisted: ${msgObj.contractTxId}`;
    }
  }

  if (validationMessage !== null) {
    logger.warn('Message rejected:', validationMessage);
    events.reject(nodeDbEvents, msgObj.contractTxId, validationMessage);
    return;
  }

  const contractTxId = msgObj.contractTxId;
  const isRegistered = await hasContract(nodeDb, contractTxId);

  const baseMessage = {
    contractTxId,
    appSyncKey: config.appSync.key,
    test: isTestInstance
  };
  if (msgObj.initialState) {
    if (isRegistered) {
      validationMessage = 'Contract already registered';
      logger.warn(validationMessage);
      events.reject(nodeDbEvents, msgObj.contractTxId, validationMessage);
      return;
    }
    const jobId = msgObj.contractTxId;
    await registerQueue.add(
      'initContract',
      {
        ...baseMessage,
        initialState: msgObj.initialState
      },
      { jobId }
    );
    logger.info('Published to register queue', jobId);
  }
}

async function subscribeToGatewayNotifications(onMessage) {
  const onError = (err) => logger.error('Failed to subscribe:', err);

  const pubsubType = config.pubsub.type;
  logger.info(`Starting pubsub in ${pubsubType} mode`);
  const subscriber = new Redis(config.gwPubSubConfig);
  await subscriber.connect();
  logger.info('Connected to Warp Gateway notifications', subscriber.status);

  subscriber.subscribe('contracts', (err, count) => {
    if (err) {
      onError(err.message);
    } else {
      logger.info(`Subscribed successfully! This client is currently subscribed to ${count} channels.`);
    }
  });
  subscriber.on('message', async (channel, message) => {
    try {
      const msgObj = JSON.parse(message);
      if (msgObj.initialState && msgObj.srcTxId && config.evaluationOptions.whitelistSources.includes(msgObj.srcTxId)) {
        logger.info(`Registering contract ${msgObj.contractTxId}[${msgObj.srcTxId}] from channel '${channel}'`);
        await onMessage(msgObj);
      }
    } catch (e) {
      logger.error(e);
      logger.error(message);
    }
  });
  process.on('exit', () => subscriber.disconnect());
}

const compressionSettings = {
  threshold: 2048,
  deflate: false,
  br: {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 4
    }
  }
};

function corsConfig() {
  return cors({
    async origin() {
      return '*';
    }
  });
}

async function clearQueue(queue) {
  // await deleteOldActiveJobs(queue);
  await queue.obliterate({ force: true });
}

function isTxIdValid(txId) {
  const validTxIdRegex = /[a-z0-9_-]{43}/i;
  return validTxIdRegex.test(txId);
}

setInterval(() => {
  timestamp = Date.now();
}, config.workersConfig.jobIdRefreshSeconds * 1000);

// Graceful shutdown
async function cleanup(callback) {
  logger.info('Interrupted');
  await updateWorker?.close();
  await registerWorker?.close();
  await warp.close();
  nodeDb.destroy();
  nodeDbEvents.destroy();
  logger.info('Clean up finished');
  callback();
}

exitHook(cleanup);
