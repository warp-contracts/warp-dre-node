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

LoggerFactory.INST.logLevel('none');

const logger = LoggerFactory.INST.create('listener');
LoggerFactory.INST.logLevel('info', 'listener');
LoggerFactory.INST.logLevel('info', 'processor');

let isTestInstance = false;
let allowUnsafe = false;
let port = 8080;

(async () => {
  const args = process.argv.slice(2);
  logger.info('🚀🚀🚀 Starting execution node with params:', args);

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

  const queueEvents = new QueueEvents('evaluate');
  queueEvents.on('completed', ({jobId}) => {
    logger.info('Job completed', jobId);
  });

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
})();

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

  subscriber.on("message", async (channel, message) => {
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


    if ((await isProcessingContract(evaluationQueue, msgObj.contractTxId))) {
      logger.warn(`Contract ${msgObj.contractTxId} is being processed, skipping`);
      return;
    }

    await evaluationQueue.add('evaluateContract', {
      contractTxId: msgObj.contractTxId,
      allowUnsafeClient: msgObj.isUnsafe
    });

    logger.info('Published on evaluation queue');
  });
}

// https://github.com/taskforcesh/bullmq/issues/1506
async function deleteOldActiveJobs(queue) {
  const oldActiveJobs = await queue.getJobs(['active']);
  await Promise.allSettled(oldActiveJobs.map((job) => job.remove()));
}

async function isProcessingContract(queue, contractTxId) {
  const activeJobs = await queue.getJobs(['active', 'waiting']);
  return activeJobs.some((job) => {
    return job.data.contractTxId === contractTxId;
  });
}

function readGwPubSubConfig() {
  const json = fs.readFileSync(path.join('.secrets', 'gw-pubsub.json'), "utf-8");
  return JSON.parse(json);
}

function isTxIdValid(txId) {
  const validTxIdRegex = /[a-z0-9_-]{43}/i;
  return validTxIdRegex.test(txId);
}