const { config } = require('../config');
const { getLastSyncTimestamp } = require('../db/nodeDb');
module.exports = async (ctx) => {
  const { registerQueue, updateQueue, postEvalQueue, nodeDb } = ctx;
  const response = {};

  try {
    response.node = config.dreName;
    response.lastSyncTimestamp = await getLastSyncTimestamp(nodeDb);
    response.queues_totals = {
      update: {
        ...await updateQueue.getJobCounts('active', 'waiting'),
      },
      postEval: {
        ...await postEvalQueue.getJobCounts('active', 'waiting'),
      },
      register: {
        ...await registerQueue.getJobCounts('active', 'waiting')
      }
    };

    response.manifest = await config.nodeManifest;
    response.workersConfig = config.workersConfig;

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
