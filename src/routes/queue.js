module.exports = async (ctx) => {
  const {queue} = ctx;
  const response = {};

  try {
    const metrics = await queue.getMetrics('completed');
    response.completed = metrics;
    response.active = await queue.getJobs(['active']);
    response.waiting = await queue.getJobs(['waiting']);

    ctx.body = response;
    ctx.status = 200;
  } catch (e) {
    ctx.body = e.message;
    ctx.status = 500;
  }

};
