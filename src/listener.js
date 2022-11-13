const {Queue, Worker, MetricsTime, QueueEvents} = require("bullmq");
const path = require("path");
const os = require("os");
const Redis = require("ioredis");
const {LoggerFactory} = require("warp-contracts");
const Koa = require('koa');
const cors = require('@koa/cors');
const bodyParser = require("koa-bodyparser");
const compress = require("koa-compress");
const zlib = require("zlib");
const router = require("./router");
const fs = require("fs");
const {readGwPubSubConfig, readApiKeysConfig} = require("./config");

LoggerFactory.INST.logLevel('none');

const logger = LoggerFactory.INST.create('listener');
LoggerFactory.INST.logLevel('info', 'listener');
LoggerFactory.INST.logLevel('info', 'processor');

let isTestInstance = false;
let allowUnsafe = false;
let port = 8080;
let jobIdSuffix = 0;
let blacklisted = {};

const apiKeys = readApiKeysConfig();

async function runListener() {
  const args = process.argv.slice(2);
  logger.info('🚀🚀🚀 Starting execution node with params:', args);

  if (fs.existsSync('blacklisted.json')) {
    blacklisted = JSON.parse(fs.readFileSync('blacklisted.json', "utf-8"));
  }

  process.on('SIGINT', function () {
    fs.writeFileSync('blacklisted.json', JSON.stringify(blacklisted), {encoding: 'utf8', flag: 'w'});
    process.exit();
  });

  if (args.length) {
    if (args.some(a => a === 'test')) {
      isTestInstance = true;
    }
    if (args.some(a => a === 'allowUnsafe')) {
      allowUnsafe = true;
    }
  }

  const evaluationQueue = new Queue('evaluate', {
    connection: {
      enableOfflineQueue: false,
    },
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: {
        age: 24 * 3600
      },
    }
  });

  const queueEvents = new QueueEvents('evaluate');
  queueEvents.on('failed', ({jobId}) => {
    const contractTxId = jobId.split('|')[0];
    logger.info('Job failed', {jobId, contractTxId});
    if (!blacklisted[contractTxId]) {
      blacklisted[contractTxId] = 1;
    } else {
      blacklisted[contractTxId] += 1;
    }
  });

  await deleteOldActiveJobs(evaluationQueue);
  await evaluationQueue.obliterate();

  const processorFile = path.join(__dirname, 'processor');
  const worker = new Worker('evaluate', processorFile, {
    concurrency: os.cpus().length,
    metrics: {
      maxDataPoints: MetricsTime.ONE_WEEK * 2,
    },
  });

  await subscribeToGatewayNotifications(evaluationQueue);

  const app = new Koa();
  app.use(cors({
    async origin() {
      return '*';
    },
  }));
  app.use(compress({
    threshold: 2048,
    deflate: false,
    br: {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 4
      }
    }
  }));

  app.use(bodyParser());
  app.use(router.routes());
  app.use(router.allowedMethods());
  app.context.queue = evaluationQueue;
  app.listen(port);

  logger.info(`Listening on port ${port}`);
}

runListener().catch((e) => {
  logger.error(e);
})

async function subscribeToGatewayNotifications(evaluationQueue) {
  const connectionOptions = readGwPubSubConfig();
  const subscriber = new Redis(connectionOptions);
  await subscriber.connect();
  logger.info("Connected to gateway notifications", subscriber.status);

  subscriber.subscribe("contracts", (err, count) => {
    if (err) {
      logger.error("Failed to subscribe:", err.message);
    } else {
      logger.info(
        `Subscribed successfully! This client is currently subscribed to ${count} channels.`
      );
    }
  });

  subscriber.on("message", (channel, message) => {
    logger.info(`Received '${message}' from channel '${channel}'`);

    const msgObj = JSON.parse(message);
    if (!isTxIdValid(msgObj.contractTxId)) {
      logger.warn('Invalid txid format');
      return;
    }

    if (msgObj.isUnsafe && !allowUnsafe) {
      logger.warn('Skipping unsafe contract');
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

    if (blacklisted[msgObj.contractTxId]) {
      if (blacklisted[msgObj.contractTxId] > 3) {
        logger.warn('Contract blacklisted', msgObj.contractTxId);
        return;
      }
    }

    const jobId = msgObj.sortKey
      ? `${msgObj.contractTxId}|${msgObj.sortKey}`
      : `${msgObj.contractTxId}|${jobIdSuffix}`;

    logger.info("jobId", jobId);

    evaluationQueue.add('evaluateContract', {
      contractTxId: msgObj.contractTxId,
      allowUnsafeClient: msgObj.isUnsafe,
      appSyncKey: apiKeys.appsync,
      test: isTestInstance
    }, {
      jobId
    });

    logger.info('Published on evaluation queue', msgObj.contractTxId);
  });
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
