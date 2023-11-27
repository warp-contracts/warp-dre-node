const { config } = require('../config');
const { getLastSyncTimestamp } = require('../db/nodeDb');
module.exports = async (ctx) => {
  const { registerQueue, updateQueue, postEvalQueue, nodeDb } = ctx;
  const response = {};

  try {
    response.node = config.dreName;
    response.lastSyncTimestamp = await getLastSyncTimestamp(nodeDb);

    response.manifest = await config.nodeManifest;
    response.workersConfig = config.workersConfig;

    const registerActiveJobs = await registerQueue.getJobs(['active']);
    const registerWaitingJobs = await registerQueue.getJobs(['waiting']);

    response.queues_totals = {
      update: await updateQueue.getJobCounts(),
      postEval: await postEvalQueue.getJobCounts(),
      register: await registerQueue.getJobCounts()
    };

    response.queues_details = {
      register: {
        active: registerActiveJobs.map(mapJob),
        waiting: registerWaitingJobs.map(mapJob)
      }
    };

    ctx.body = response;
    ctx.status = 200;
  } catch (e) {
    ctx.body = e.message;
    ctx.status = 500;
    throw e;
  }
};

function mapJob(j) {
  return j.id;
}
