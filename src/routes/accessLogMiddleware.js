const util = require('node:util');
const { LoggerFactory } = require("warp-contracts");

const LOG_FORMAT = '%s %s "%s %s HTTP/%s" %d %s %s[ms]';

// const logger = LoggerFactory.INST.create('access');
// LoggerFactory.INST.logLevel('debug', 'access');

module.exports = async (ctx, next) => {
  // console.log("access log middleware");
  const t0 = performance.now();
  await next();
  const t1 = performance.now();
  try {
    console.log(util.format(
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
