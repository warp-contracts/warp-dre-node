const { Queue, Worker, MetricsTime, QueueEvents } = require('bullmq');
const path = require('path');
const Redis = require('ioredis');
const { config, logConfig } = require('./config');
const { insertFailure, getFailures, connect, doBlacklist, getLastSyncTimestamp } = require('./db/nodeDb');

const logger = require('./logger')('syncer');
const exitHook = require('async-exit-hook');
const { warp, pgClient } = require('./warp');
const pollGateway = require('./workers/pollGateway');

let isTestInstance = config.env === 'test';
const queues = [];

let nodeDb;

async function runSyncer() {
  logger.info('🚀🚀🚀 Starting syncer node');
  await logConfig();

  nodeDb = connect();
  await pgClient.open();

  const registerQueue = await configureQueue('register', onFailedRegisterJob);
  const signatureQueue = await configureQueue('signature');

  const theVeryFirstTimestamp = config.firstInteractionTimestamp;
  const lastSyncTimestamp = await getLastSyncTimestamp(nodeDb);
  logger.info('Last sync timestamp result', lastSyncTimestamp);
  const startTimestamp = lastSyncTimestamp ? lastSyncTimestamp : theVeryFirstTimestamp;

  await pollGateway(
    nodeDb,
    config.evaluationOptions.whitelistSources,
    startTimestamp,
    windowsMs(),
    false,
    signatureQueue
  );

  const onMessage = async (data) => await processContractData(data, nodeDb, registerQueue);
  await subscribeToGatewayNotifications(onMessage);
}

function windowsMs() {
  const windows = [];
  if (config.syncWindowSeconds.length < 1) {
    throw new Error('Provide at least one sync window (in seconds)');
  }
  for (let w of config.syncWindowSeconds) {
    windows.push(parseInt(w) * 1000);
  }
  return windows;
}

runSyncer().catch((e) => {
  logger.error(e);
});

async function onFailedRegisterJob(contractTxId, jobId, failedReason) {
  await insertFailure(nodeDb, {
    contract_tx_id: contractTxId,
    evaluation_options: config.evaluationOptions,
    sdk_config: config.warpSdkConfig,
    job_id: jobId,
    failure: failedReason
  });
  if (failedReason.includes('[MaxStateSizeError]')) {
    await doBlacklist(nodeDb, contractTxId, config.workersConfig.maxFailures);
  }
}

async function processContractData(msgObj, nodeDb, registerQueue) {
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
    return;
  }

  const contractTxId = msgObj.contractTxId;
  const isRegistered = await warp.stateEvaluator.hasContractCached(contractTxId);

  const baseMessage = {
    contractTxId,
    appSyncKey: config.appSync.key,
    test: isTestInstance
  };
  if (msgObj.initialState) {
    if (isRegistered) {
      validationMessage = 'Contract already registered';
      logger.warn(validationMessage);
      return;
    }
    const jobId = msgObj.contractTxId;
    await registerQueue.add(
      'initContract',
      {
        ...baseMessage,
        publishContract: true,
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

async function configureQueue(queueName, onFailedJob) {
  async function clearQueue(queue) {
    await queue.obliterate({ force: true });
  }

  const queue = new Queue(queueName, {
    connection: config.bullMqConnection,
    defaultJobOptions: {
      removeOnComplete: {
        age: 3600
      },
      removeOnFail: true
    }
  });

  const queueEvents = new QueueEvents(queueName, { connection: config.bullMqConnection });

  queueEvents.on('failed', async ({ jobId, failedReason }) => {
    logger.error(`${queueName} job failed`, { jobId, failedReason });
    const contractTxId = jobId;
    if (onFailedJob) {
      await onFailedJob(contractTxId, jobId, failedReason);
    }
  });
  queueEvents.on('added', async ({ jobId }) => {
    logger.info(`Job added to ${queueName} queue`, jobId);
  });
  queueEvents.on('completed', async ({ jobId }) => {
    logger.info(`${queueName} job completed`, jobId);
  });

  await clearQueue(queue);

  const queueProcessor = path.join(__dirname, 'workers', `${queueName}Processor`);
  const queueWorker = new Worker(queueName, queueProcessor, {
    concurrency: config.workersConfig[queueName],
    connection: config.bullMqConnection
  });

  queues.push(queueWorker);

  return queue;
}

function isTxIdValid(txId) {
  const validTxIdRegex = /[a-z0-9_-]{43}/i;
  return validTxIdRegex.test(txId);
}

// Graceful shutdown
async function cleanup(callback) {
  logger.info('Interrupted');
  for (const queue of queues) {
    await queue.close();
  }
  await warp.close();
  logger.info('Clean up finished');
  callback();
}

exitHook(cleanup);
