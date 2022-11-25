const {Queue, Worker, MetricsTime, QueueEvents} = require("bullmq");
const path = require("path");
const Redis = require("ioredis");
const {LoggerFactory} = require("warp-contracts");
const Koa = require('koa');
const cors = require('@koa/cors');
const bodyParser = require("koa-bodyparser");
const compress = require("koa-compress");
const zlib = require("zlib");
const router = require("./router");
const {readGwPubSubConfig, readApiKeysConfig, getEvaluationOptions, getWarpSdkConfig, readWorkersConfig} = require("./config");
const {attachPaginate} = require('knex-paginate');
const {createNodeDbTables, insertFailure, upsertBlacklist, getFailures, connect, events, hasContract, connectEvents,
  createNodeDbEventsTables
} = require("./db/nodeDb");

LoggerFactory.INST.logLevel('info');

const logger = LoggerFactory.INST.create('listener');
LoggerFactory.INST.logLevel('info', 'listener');
LoggerFactory.INST.logLevel('info', 'interactionsProcessor');
LoggerFactory.INST.logLevel('info', 'contractsProcessor');

let isTestInstance = false;
let allowUnsafe = false;
let port = 8080;

let timestamp = Date.now();

const apiKeys = readApiKeysConfig();
const workersConfig = readWorkersConfig();

const updateQueueName = 'update';
const registerQueueName = 'register';

async function runListener() {
  const args = process.argv.slice(2);
  logger.info('🚀🚀🚀 Starting execution node with params:', args);

  const nodeDb = connect();
  const nodeDbEvents = connectEvents();

  await createNodeDbTables(nodeDb);
  await createNodeDbEventsTables(nodeDbEvents);
  setFlags(args);

  logger.info('Workers config', workersConfig);

  let timestamp = Date.now();
  setInterval(() => {
    timestamp = Date.now();
  }, workersConfig.jobIdRefreshSeconds * 1000);


  const updateQueue = new Queue(updateQueueName, {
    connection: {
      enableOfflineQueue: true,
    },
    defaultJobOptions: {
      removeOnComplete: {
        age: workersConfig.jobIdRefreshSeconds
      },
      removeOnFail: true,
    }
  });
  const registerQueue = new Queue(registerQueueName, {
    connection: {
      enableOfflineQueue: true,
    },
    defaultJobOptions: {
      removeOnComplete: {
        age: 3600
      },
      removeOnFail: true,
    }
  });

  const updateEvents = new QueueEvents(updateQueueName);
  const registerEvents = new QueueEvents(registerQueueName);

  // TODO: yeah, copy-pastes
  updateEvents.on('failed', async ({jobId, failedReason}) => {
    logger.error('Update job failed', {jobId, failedReason});
    const contractTxId = jobId.split('|')[0];
    await insertFailure(nodeDb, {
      contract_tx_id: contractTxId,
      evaluation_options: getEvaluationOptions(),
      sdk_config: getWarpSdkConfig(),
      job_id: jobId,
      failure: failedReason
    });
    await upsertBlacklist(nodeDb, contractTxId);
    events.failure(nodeDbEvents, contractTxId, failedReason);
  });
  updateEvents.on('added', async ({jobId}) => {
    logger.info('Job added to update queue', jobId);
    const contractTxId = jobId.split("|")[0];
    events.update(nodeDbEvents, contractTxId);
  });
  updateEvents.on('completed', async ({jobId}) => {
    logger.info('Update job completed', jobId);
    const contractTxId = jobId.split("|")[0];
    events.evaluated(nodeDbEvents, contractTxId);
  });

  registerEvents.on('failed', async ({jobId, failedReason}) => {
    logger.error('Register job failed', {jobId, failedReason});
    await insertFailure(nodeDb, {
      contract_tx_id: jobId,
      evaluation_options: getEvaluationOptions(),
      sdk_config: getWarpSdkConfig(),
      job_id: jobId,
      failure: failedReason
    });
    await upsertBlacklist(nodeDb, jobId);
    events.failure(nodeDbEvents, jobId, failedReason);
  });
  registerEvents.on('added', async ({jobId}) => {
    logger.info('Job added to register queue', jobId);
    events.register(nodeDbEvents, jobId);
  });
  registerEvents.on('completed', async ({jobId}) => {
    logger.info('Register job completed', jobId);
    events.evaluated(nodeDbEvents, jobId);
  });

  await clearQueue(updateQueue);
  await clearQueue(registerQueue);

  const updateProcessor = path.join(__dirname, 'workers', 'updateProcessor');
  new Worker(updateQueueName, updateProcessor, {
    concurrency: workersConfig.update,
    metrics: {
      maxDataPoints: MetricsTime.ONE_WEEK,
    },
  });

  const registerProcessor = path.join(__dirname, 'workers', 'registerProcessor');
  new Worker(registerQueueName, registerProcessor, {
    concurrency: workersConfig.register,
    metrics: {
      maxDataPoints: MetricsTime.ONE_WEEK,
    },
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
      ctx.redirect("/status");
    });
  app.context.updateQueue = updateQueue;
  app.context.registerQueue = registerQueue;
  app.context.nodeDb = nodeDb;
  app.context.nodeDbEvents = nodeDbEvents;
  app.listen(port);

  await subscribeToGatewayNotifications(nodeDb, nodeDbEvents, updateQueue, registerQueue);

  logger.info(`Listening on port ${port}`);
}

runListener().catch((e) => {
  logger.error(e);
})

async function subscribeToGatewayNotifications(nodeDb, nodeDbEvents, updatedQueue, registerQueue) {
  const connectionOptions = readGwPubSubConfig();
  const subscriber = new Redis(connectionOptions);
  await subscriber.connect();
  logger.info("Connected to Warp Gateway notifications", subscriber.status);

  subscriber.subscribe("contracts", (err, count) => {
    if (err) {
      logger.error("Failed to subscribe:", err.message);
    } else {
      logger.info(
        `Subscribed successfully! This client is currently subscribed to ${count} channels.`
      );
    }
  });


  subscriber.on("message", async (channel, message) => {
    const msgObj = JSON.parse(message);
    logger.info(`Received '${msgObj.contractTxId}' from channel '${channel}'`);

    let validationMessage = null;
    if (!isTxIdValid(msgObj.contractTxId)) {
      validationMessage = 'Invalid tx id format';
    }

    if ((!msgObj.initialState && !msgObj.interaction)
      || (msgObj.initialState && msgObj.interaction)) {
      validationMessage = 'Invalid message format';
    }

    if (msgObj.test && !isTestInstance) {
      validationMessage = 'Skipping test instance message';
    }

    if (!msgObj.test && isTestInstance) {
      validationMessage = 'Skipping non-test instance message';
    }

    const contractFailures = await getFailures(nodeDb, msgObj.contractTxId);

    if (Number.isInteger(contractFailures) && contractFailures > workersConfig.maxFailures - 1) {
      validationMessage = 'Contract blacklisted';
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
      appSyncKey: apiKeys.appsync,
      test: isTestInstance,
    };
    if (msgObj.initialState) {
      if (isRegistered) {
        validationMessage = 'Contract already registered';
        logger.warn(validationMessage);
        events.reject(nodeDbEvents, msgObj.contractTxId, validationMessage);
        return;
      }
      const jobId = msgObj.contractTxId;
      await registerQueue.add('initContract', {
        ...baseMessage,
        initialState: msgObj.initialState
      }, {jobId});
      logger.info("Published to contracts queue", jobId);
    } else if (msgObj.interaction) {
      if (!isRegistered) {
        logger.warn('Contract not registered, adding to register queue', contractTxId);
        await registerQueue.add('initContract', {
          ...baseMessage,
          force: true
        }, {jobId: contractTxId});
      } else {
        const jobId = `${msgObj.contractTxId}|${timestamp}`;
        await updatedQueue.add('evaluateInteraction', {
          ...baseMessage,
          interaction: msgObj.interaction
        }, {jobId});
      }
    }
  });
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
    },
  });
}

async function clearQueue(queue) {
  // await deleteOldActiveJobs(queue);
  await queue.obliterate({force: true});
}

function isTxIdValid(txId) {
  const validTxIdRegex = /[a-z0-9_-]{43}/i;
  return validTxIdRegex.test(txId);
}

setInterval(() => {
  timestamp = Date.now();
}, workersConfig.jobIdRefreshSeconds * 1000);

function setFlags(args) {
  if (args.length) {
    if (args.some(a => a === 'test')) {
      isTestInstance = true;
    }
    if (args.some(a => a === 'allowUnsafe')) {
      allowUnsafe = true;
    }
  }
}
