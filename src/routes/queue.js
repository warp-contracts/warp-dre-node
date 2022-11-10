const warp = require('../warp');

let allContracts = null;

setInterval(async () => {
  allContracts = await warp.stateEvaluator.allCachedContracts();
}, 30 * 1000);

module.exports = async (ctx) => {
  const {queue} = ctx;
  const response = {};

  try {
    if (allContracts == null) {
      allContracts = await warp.stateEvaluator.allCachedContracts();
    }

    // const metricsCompleted = await queue.getMetrics('completed');
    // const metricsFailed = await queue.getMetrics('failed');
    response.cachedContracts = allContracts;
    response.active = await queue.getJobs(['active']);
    response.waiting = await queue.getJobs(['waiting']);
    response.failed = await queue.getJobs(['failed']);

    ctx.body = response;
    ctx.status = 200;
  } catch (e) {
    ctx.body = e.message;
    ctx.status = 500;
  }

};
