const { config } = require('../config');
const { getLastSyncTimestamp } = require("../db/nodeDb");
module.exports = async (ctx) => {
  const { nodeDb } = ctx;
  const response = {};

  try {
    response.node = config.dreName;
    response.lastSyncTimestamp = await getLastSyncTimestamp(nodeDb);

    response.manifest = await config.nodeManifest;
    response.workersConfig = config.workersConfig;

    /*const registerActiveJobs = await registerQueue.getJobs(['active']);
    const registerWaitingJobs = await registerQueue.getJobs(['waiting']);

    response.queues_totals = {
      register: {
        active: registerActiveJobs.length,
        waiting: registerWaitingJobs.length
      }
    };

    response.queues_details = {
      register: {
        active: registerActiveJobs.map(mapJob),
        waiting: registerWaitingJobs.map(mapJob)
      }
    };*/

    ctx.body = response;
    ctx.status = 200;
  } catch (e) {
    ctx.body = e.message;
    ctx.status = 500;
    throw e;
  }
};
