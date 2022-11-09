module.exports = async (ctx) => {
  const {queue} = ctx;
  const response = {};

  try {
    const metricsCompleted = await queue.getMetrics('completed');
    const metricsFailed = await queue.getMetrics('failed');
    response.completedMetrics = metricsCompleted;
    response.failedMetrics = metricsFailed;
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
