const { fork } = require('node:child_process');
const { LoggerFactory } = require('warp-contracts');
const path = require('path');

const logger = LoggerFactory.INST.create('pollRunner');
LoggerFactory.INST.logLevel('info', 'syncer');

const createWorker = function () {
  const worker = fork(path.join(__dirname, './pollChildProcess.js'));
  logger.info(`Worker ${worker.pid} created`);
  return worker;
};

const objectToError = function (o) {
  const error = new Error(o.message);
  error.name = o.name;
  error.stack = o.stack;
  error.cause = o.cause;
  return error;
};

module.exports = {
  init: function () {
    let singleWorker = createWorker();
    const resetWorker = function () {
      if (singleWorker != null) {
        const worker = singleWorker;
        singleWorker = null;
        if (!worker.killed) {
          worker.kill();
        }
        worker.unref();
      }
      singleWorker = createWorker();
    };
    return {
      exec: function (updateInput) {
        const id = singleWorker.pid;
        return new Promise((resolve, reject) => {
          singleWorker
            .once('message', (response) => {
              logger.info(`Worker ${id} finished with message `, response);
              singleWorker.removeAllListeners('error');
              singleWorker.removeAllListeners('exit');
              if (response.failed) {
                reject(objectToError(response.error));
              } else {
                resolve(response.message);
              }
            })
            .once('error', (err) => {
              logger.error(`Worker, pid: ${id} finished with error. Setting up new worker.`, err);
              reject(err);
            })
            .once('exit', (code, signal) => {
              if (code !== 0) {
                logger.error(`Worker, pid: ${id} exited with error, code ${code}`);
              } else {
                logger.info(`Worker, pid: ${id} exited, code ${code}`);
              }
              resetWorker();
              reject(new Error(`Worker terminated Unexpectedly code: ${code} signal: ${signal}`));
            })
            .send(updateInput);
        });
      }
    };
  }
};
