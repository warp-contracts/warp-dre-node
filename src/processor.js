const warp = require('./warp');
const {LoggerFactory} = require("warp-contracts");

LoggerFactory.INST.logLevel('none');
LoggerFactory.INST.logLevel('info', 'processor');
const logger = LoggerFactory.INST.create('processor');

module.exports = async (job) => {
  const contractTxId = job.data.contractTxId;
  const allowUnsafeClient = job.data.allowUnsafeClient === true;
  logger.info('Evaluating', contractTxId);
  const result = await warp.contract(contractTxId)
    .setEvaluationOptions({
      useVM2: true,
      ignoreExceptions: true,
      maxCallDepth: 5,
      maxInteractionEvaluationTimeSeconds: 10,
      allowBigInt: true,
      allowUnsafeClient,
      internalWrites: true,
    })
    .readState();
  logger.info(`Evaluated ${contractTxId} @ ${result.sortKey}`);
};