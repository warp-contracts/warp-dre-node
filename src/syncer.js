const Redis = require('ioredis');
const { config, logConfig } = require('./config');
const {
  getFailures,
  getLastSyncTimestamp,
  createNodeDbTables,
  drePool,
  insertFailure,
  doBlacklist
} = require('./db/nodeDb');

const logger = require('./logger')('syncer');
const exitHook = require('async-exit-hook');
const { warp, pgClient } = require('./warp');
const pollGateway = require('./workers/pollGateway');
const { createAggDbTables } = require('./db/aggDbSetup');
const { queuesCleanUp, initQueue, postEvalQueue, registerQueue, maintenanceQueue } = require('./bullQueue');

let isTestInstance = config.env === 'test';

async function runSyncer() {
  logger.info('🚀🚀🚀 Starting syncer node');
  await logConfig();

  await createNodeDbTables();
  await createAggDbTables();

  await pgClient.open();
  await initQueue(postEvalQueue);
  await initQueue(registerQueue, onFailedRegisterJob);
  await initQueue(maintenanceQueue);

  const theVeryFirstTimestamp = config.firstInteractionTimestamp;
  const lastSyncTimestamp = await getLastSyncTimestamp();
  logger.info('Last sync timestamp result', lastSyncTimestamp);
  const startTimestamp = lastSyncTimestamp ? lastSyncTimestamp : theVeryFirstTimestamp;

  await pollGateway(config.evaluationOptions.whitelistSources, startTimestamp, windowsMs(), false);
  scheduleMaintenance(3000);

  const onMessage = async (data) => await processContractData(data, registerQueue);
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

async function processContractData(msgObj, registerQueue) {
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
    const contractFailures = await getFailures(drePool, msgObj.contractTxId);
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
        contractTxId,
        appSyncKey: config.appSync.key,
        test: isTestInstance,
        requiresPublish: true,
        tags: msgObj.tags
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

function scheduleMaintenance(everyMillis) {
  (function workerLoop() {
    setTimeout(async function () {
      await maintenanceQueue.add('maintenance');
      workerLoop();
    }, everyMillis);
  })();
}

function isTxIdValid(txId) {
  const validTxIdRegex = /[a-z0-9_-]{43}/i;
  return validTxIdRegex.test(txId);
}

// Graceful shutdown
async function cleanup(callback) {
  logger.info('Interrupted');
  await queuesCleanUp();
  await warp.close();
  await drePool.end();
  logger.info('Clean up finished');
  callback();
}

async function onFailedRegisterJob(contractTxId, jobId, failedReason) {
  await insertFailure({
    contract_tx_id: contractTxId,
    evaluation_options: config.evaluationOptions,
    sdk_config: config.warpSdkConfig,
    job_id: jobId,
    failure: failedReason
  });
  if (failedReason.includes('[MaxStateSizeError]')) {
    await doBlacklist(contractTxId, config.workersConfig.maxFailures);
  }
}

exitHook(cleanup);
