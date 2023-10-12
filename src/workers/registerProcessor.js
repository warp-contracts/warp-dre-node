const { warp } = require('../warp');
const { LoggerFactory, genesisSortKey, TagsParser, Transaction } = require('warp-contracts');
const { checkStateSize } = require('./common');
const { config } = require('../config');
const { postEvalQueue } = require('../bullQueue');

LoggerFactory.INST.logLevel('info', 'contractsProcessor');
const logger = LoggerFactory.INST.create('contractsProcessor');
LoggerFactory.INST.logLevel('debug', 'EvaluationProgressPlugin');

module.exports = async (job) => {
  try {
    const contractTxId = job.data.contractTxId;

    logger.info('Register Processor', contractTxId);

    const result = await warp
      .contract(contractTxId)
      .setEvaluationOptions(config.evaluationOptions)
      .readState(genesisSortKey);
    const cd = await warp.definitionLoader.getCache().get({ key: contractTxId, sortKey: 'cd' });

    const tags = job.data.tags || (await decodeTags(cd.cachedValue.contractTx));

    checkStateSize(result.cachedValue.state);

    await postEvalQueue.add(
      'sign',
      {
        contractTxId,
        tags,
        result,
        requiresPublish: job.data.requiresPublish
      },
      { priority: 1 }
    );
  } catch (e) {
    logger.error('Exception in register processor', e);
    throw new Error(e);
  }
};

async function decodeTags(contractTx) {
  return contractTx ? new TagsParser().decodeTags(new Transaction(contractTx)) : [];
}
