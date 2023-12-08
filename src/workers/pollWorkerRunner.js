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
      exec: function (job) {
        const id = singleWorker.pid;
        const contractTxId = job.data.contractTxId;
        return new Promise((resolve, reject) => {
          if (!singleWorker.connected) {
            resetWorker();
            logger.error(`Worker ${id} disconnected. Setting up new worker.`);
          }
          logger.info(`Worker ${id} running`, contractTxId);
          singleWorker
            .once('message', (response) => {
              singleWorker.removeAllListeners('error');
              singleWorker.removeAllListeners('exit');
              if (response.failed) {
                logger.error(`Worker ${id} failed with response`, contractTxId, response);
                reject(objectToError(response.error));
              } else {
                logger.info(`Worker ${id} finished with response`, contractTxId, response);
                resolve(response.message);
              }
            })
            .once('error', (err) => {
              logger.error(`Worker ${id} finished with error. Setting up new worker.`, contractTxId, err);
              resetWorker();
              reject(err);
            })
            .once('exit', (code, signal) => {
              if (code !== 0) {
                logger.error(`Worker ${id} exited with error, code ${code} Setting up new worker.`, contractTxId);
              } else {
                logger.info(`Worker ${id} exited, code ${code} Setting up new worker.`, contractTxId);
              }
              resetWorker();
              reject(
                new Error(`Worker ${id} terminated Unexpectedly code: ${code} signal: ${signal} tx: ${contractTxId}`)
              );
            })
            .send(job);
        });
      }
    };
  }
};
