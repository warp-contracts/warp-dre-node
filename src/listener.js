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
const {createNodeDbTables, insertFailure, upsertBlacklist, getFailures, connect} = require("./db/nodeDb");

LoggerFactory.INST.logLevel('info');

const logger = LoggerFactory.INST.create('listener');
LoggerFactory.INST.logLevel('info', 'listener');
LoggerFactory.INST.logLevel('info', 'interactionsProcessor');
LoggerFactory.INST.logLevel('info', 'contractsProcessor');

let isTestInstance = false;
let allowUnsafe = false;
let port = 8080;

// the amount of failures before contract is considered as blacklisted
let maxFailures = 3;

let timestamp = Date.now();

const apiKeys = readApiKeysConfig();
const workersConfig = readWorkersConfig();

async function runListener() {
  const args = process.argv.slice(2);
  logger.info('🚀🚀🚀 Starting execution node with params:', args);

  const nodeDb = connect();
  attachPaginate();

  await createNodeDbTables(nodeDb);
  setFlags(args);

  logger.info('Workers config', workersConfig);

  let timestamp = Date.now();
  setInterval(() => {
    timestamp = Date.now();
  }, workersConfig.jobIdRefreshSeconds * 1000);


  const interactionsQueue = new Queue('interactions', {
    connection: {
      enableOfflineQueue: false,
    },
    defaultJobOptions: {
      removeOnComplete: {
        age: workersConfig.jobIdRefreshSeconds
      },
      removeOnFail: true,
    }
  });
  const contractsQueue = new Queue('contracts', {
    connection: {
      enableOfflineQueue: false,
    },
    defaultJobOptions: {
      removeOnComplete: {
        age: 3600
      },
      removeOnFail: true,
    }
  });

  const interactionsEvents = new QueueEvents('interactions');
  interactionsEvents.on('failed', async ({jobId, failedReason}) => {
    logger.error('Job failed', {jobId, failedReason});
    const contractTxId = jobId.split('|')[0];
    await insertFailure(nodeDb, {
      contract_tx_id: contractTxId,
      evaluation_options: getEvaluationOptions(),
      sdk_config: getWarpSdkConfig(),
      job_id: jobId,
      failure: failedReason
    });
    await upsertBlacklist(nodeDb, contractTxId);
  });
  interactionsEvents.on('added', async ({jobId}) => {
    logger.error('Job added to interactions queue', jobId);
  });


  await clearQueue(interactionsQueue);
  await clearQueue(contractsQueue);

  const interactionProcessor = path.join(__dirname, 'workers', 'interactionProcessor');
  new Worker('interactions', interactionProcessor, {
    concurrency: workersConfig.interactions,
    metrics: {
      maxDataPoints: MetricsTime.ONE_WEEK,
    },
  });

  const contractsProcessor = path.join(__dirname, 'workers', 'contractsProcessor');
  new Worker('contracts', contractsProcessor, {
    concurrency: workersConfig.contracts,
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
    .use(router.allowedMethods());
  app.context.interactionsQueue = interactionsQueue;
  app.context.contractsQueue = contractsQueue;
  app.context.nodeDb = nodeDb;
  app.listen(port);

  await subscribeToGatewayNotifications(nodeDb, interactionsQueue, contractsQueue);

  logger.info(`Listening on port ${port}`);
}

runListener().catch((e) => {
  logger.error(e);
})

async function subscribeToGatewayNotifications(nodeDb, interactionsQueue, contractsQueue) {
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
    logger.info(`Received '${message}' from channel '${channel}'`);

    const msgObj = JSON.parse(message);
    if (!isTxIdValid(msgObj.contractTxId)) {
      logger.warn('Invalid txid format');
      return;
    }

    if ((!msgObj.initialState && !msgObj.interaction)
      || (msgObj.initialState && msgObj.interaction)) {
      logger.warn('Invalid message format');
      return;
    }

    if (msgObj.test && !isTestInstance) {
      logger.warn('Skipping test instance message');
      return;
    }

    if (!msgObj.test && isTestInstance) {
      logger.warn('Skipping non-test instance message');
      return;
    }

    const contractFailures = await getFailures(nodeDb, msgObj.contractTxId);

    if (Number.isInteger(contractFailures) && contractFailures > maxFailures - 1) {
      logger.warn('Contract blacklisted', msgObj.contractTxId);
      return;
    }

    const baseMessage = {
      contractTxId: msgObj.contractTxId,
      appSyncKey: apiKeys.appsync,
      test: isTestInstance,
    };
    if (msgObj.initialState) {
      const jobId = msgObj.contractTxId;
      await contractsQueue.add('initContract', {
        ...baseMessage,
        initialState: msgObj.initialState
      }, {jobId});
      logger.info("Published to contracts queue", jobId);
    } else if (msgObj.interaction) {
      // manually checking the queue contents
      // - e.g. using "evaluationQueue.getJobs('active')" - won't work here
      // - 'getJobs' function is async
      const jobId = `${msgObj.contractTxId}|${timestamp}`;
      await interactionsQueue.add('evaluateInteraction', {
        ...baseMessage,
        interaction: msgObj.interaction
      }, {jobId});
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

// https://github.com/taskforcesh/bullmq/issues/1506
async function deleteOldActiveJobs(queue) {
  const oldActiveJobs = await queue.getJobs(['active']);
  await Promise.allSettled(oldActiveJobs.map((job) => job.remove()));
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
