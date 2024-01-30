const util = require('node:util');

const LOG_FORMAT = '%s %s "%s %s HTTP/%s" %d %s %s[ms]';

module.exports = async (ctx, next) => {
  const t0 = performance.now();
  await next();
  const t1 = performance.now();
  try {
    ctx.accessLogger.debug(util.format(
        LOG_FORMAT,
        ctx.ip,
        ctx.method,
        `${ctx.path}${ctx.search}`,
        ctx.req.httpVersion,
        ctx.status,
        ctx.length ? ctx.length.toString() : '-',
        (t1 - t0).toFixed(3)
      )
    );
  } catch (err) {
    console.error(err);
  }
};
