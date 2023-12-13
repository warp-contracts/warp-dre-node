const { Queue, Worker, QueueEvents } = require('bullmq');
const path = require('path');
const { config } = require('./config');

const logger = require('./logger')('bullQueues');

const queues = [];
const registerQueue = configureQueue('register');
const updateQueue = configureQueue('update');
const postEvalQueue = configureQueue('postEval');
const maintenanceQueue = configureQueue('maintenance');

module.exports = {
  registerQueue,
  updateQueue,
  postEvalQueue,
  maintenanceQueue,
  initQueue: async function (queue, onFailedJob) {
    const workersConcurrency = config.workersConfig[queue.name];
    if (workersConcurrency < 1) {
      logger.info(`Skipping ${queue} worker init, concurrency set to ${workersConcurrency}`);
      return;
    }
    await queue.obliterate({ force: true });

    const queueProcessor = path.join(__dirname, 'workers', `${queue.name}Processor`);
    const queueWorker = new Worker(queue.name, queueProcessor, {
      concurrency: workersConcurrency,
      connection: config.bullMqConnection
    });

    const queueEvents = new QueueEvents(queue.name, { connection: config.bullMqConnection });

    queueEvents.on('failed', async ({ jobId, failedReason }) => {
      logger.error(`${queue.name} job failed`, { jobId, failedReason });
      const contractTxId = jobId;
      if (onFailedJob) {
        await onFailedJob(contractTxId, jobId, failedReason?.toString());
      }
    });
    queueEvents.on('added', async ({ jobId }) => {
      logger.info(`Job added to ${queue.name} queue`, jobId);
    });
    queueEvents.on('completed', async ({ jobId }) => {
      logger.info(`${queue.name} job completed`, jobId);
    });

    queues.push(queueWorker);
  },
  queuesCleanUp: async function () {
    logger.info('Interrupted');
    for (const queue of queues) {
      await queue.close();
    }
    logger.info('Queues clean up finished');
  }
};

function configureQueue(queueName) {
  return new Queue(queueName, {
    connection: config.bullMqConnection,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: true
    }
  });
}
