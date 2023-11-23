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


    response.queues_totals = {
      update: {
        active: await updateQueue.getJobs(['active']),
        waiting: await updateQueue.getJobs(['waiting']),
      },
      postEval: {
        active: await postEvalQueue.getJobs(['active']),
        waiting: await postEvalQueue.getJobs(['waiting']),
      },
      register: {
        active: await registerQueue.getJobs(['active']),
        waiting: await registerQueue.getJobs(['waiting']),
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
