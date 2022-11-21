const {getNodeManifest, readWorkersConfig} = require("../config");
module.exports = async (ctx) => {
  const {interactionsQueue} = ctx;
  const response = {};

  try {
    response.manifest = await getNodeManifest();
    response.workersConfig = readWorkersConfig();
    // const metricsCompleted = await queue.getMetrics('completed');
    // const metricsFailed = await queue.getMetrics('failed');

    const activeJobs = await interactionsQueue.getJobs(['active']);
    const waitingJobs = await interactionsQueue.getJobs(['waiting']);

    response.activeJobsSize = activeJobs?.length;
    response.waitingJobsSize = waitingJobs?.length;

    response.activeJobs = activeJobs.map(j => {
      return {
        id: j.id,
        name: j.name,
      }
    });
    response.waitingJobs = (await interactionsQueue.getJobs(['waiting'])).map(j => {
      return {
        id: j.id,
        name: j.name,
      }
    });

    ctx.body = response;
    ctx.status = 200;
  } catch (e) {
    ctx.body = e.message;
    ctx.status = 500;
    throw e;
  }

};
