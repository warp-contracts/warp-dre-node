const Koa = require('koa');
const cors = require('@koa/cors');
const bodyParser = require('koa-bodyparser');
const compress = require('koa-compress');
const zlib = require('zlib');
const router = require('./router');
const { logConfig } = require('./config');
const {
  createNodeDbTables,
  connect,
} = require('./db/nodeDb');

const logger = require('./logger')('listener');
const exitHook = require('async-exit-hook');
const warp = require('./warp');
const { execSync } = require('child_process');
const fs = require('fs');
let port = 8080;

let nodeDb;

async function runListener() {
  logger.info('🚀🚀🚀 Starting listener node');
  await logConfig();

  nodeDb = connect();

  await createNodeDbTables(nodeDb);

  if (fs.existsSync('./src/db/migrations/stateDb')) {
    execSync('npx knex --knexfile=knexConfigStateDb.js migrate:latest');
  }

  if (fs.existsSync('./src/db/migrations/eventsDb')) {
    execSync('npx knex --knexfile=knexConfigEventsDb.js migrate:latest');
  }

  const app = new Koa();
  app
    .use(corsConfig())
    .use(compress(compressionSettings))
    .use(bodyParser())
    .use(router.routes())
    .use(router.allowedMethods())
    .use(async (ctx, next) => {
      await next();
      ctx.redirect('/status');
    });
  app.context.nodeDb = nodeDb;
  app.listen(port);
}

runListener().catch((e) => {
  logger.error(e);
});


const compressionSettings = {
  threshold: 2048,
  deflate: false,
  br: {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 4
    }
  }
};

function corsConfig() {
  return cors({
    async origin() {
      return '*';
    }
  });
}

// Graceful shutdown
async function cleanup(callback) {
  logger.info('Interrupted');
  await warp.close();
  nodeDb.destroy();
  logger.info('Clean up finished');
  callback();
}

exitHook(cleanup);
