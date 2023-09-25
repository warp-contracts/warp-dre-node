const { Queue, Worker, QueueEvents } = require('bullmq');
const path = require('path');
const { config } = require('./config');
const { insertFailure, doBlacklist } = require('./db/nodeDb');

const logger = require('./logger')('bullQueues');

const queues = [];
const registerQueue = configureQueue('register', onFailedRegisterJob);
const postEvalQueue = configureQueue('postEval');

module.exports = {
  registerQueue,
  postEvalQueue,
  initQueue: async function (queue) {
    await queue.obliterate({ force: true });

    const queueProcessor = path.join(__dirname, 'workers', `${queue.name}Processor`);
    const queueWorker = new Worker(queue.name, queueProcessor, {
      concurrency: config.workersConfig[queue.name],
      connection: config.bullMqConnection
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

function configureQueue(queueName, onFailedJob) {
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

  return queue;
}
