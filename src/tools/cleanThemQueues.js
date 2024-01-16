// nobody wants to wait in line...
const { Queue } = require('bullmq');
const { config } = require('../config');

const GRACE_PERIOD = 60_000; // 1 minute
const CLEAN_LIMIT = 50_000; // max number of jobs to clean
const logger = require('../logger')('queuesClean');

(async () => {
  logger.info(`Queueueues clean started..`);
  const postEvalQueue = configureQueue('postEval');
  const postEvalCount = await postEvalQueue.getJobCountByTypes();
  logger.info(`postEval queue count  ${postEvalCount}`);
  if (postEvalCount > 100) {
    const prioritizedIds = await postEvalQueue.clean(GRACE_PERIOD, CLEAN_LIMIT, 'prioritized');
    const waitIds = await postEvalQueue.clean(GRACE_PERIOD, CLEAN_LIMIT, 'wait');
    logger.info(`Just removed prioritized jobs in count of ${prioritizedIds.length} and waiting jobs ${waitIds.length}`);
  }
  await postEvalQueue.close();
})().then(() => {
  logger.info(`Finished..`);
});

function configureQueue(queueName) {
  return new Queue(queueName, {
    connection: config.bullMqConnection,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: true
    }
  });
}
