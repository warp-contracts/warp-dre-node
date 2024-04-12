const { queryLastState } = require('../db/nodeDb');
const { isTxIdValid } = require('../common');
const { LoggerFactory } = require('warp-contracts');

LoggerFactory.INST.logLevel('debug', 'contractQueryState');
const logger = LoggerFactory.INST.create('contractQueryState');

module.exports = async (ctx) => {
  const { id: contractId, query } = ctx.query;
  logger.info(`Query state request, contractId ${contractId}, query ${query} `);

  try {
    if (!contractId) {
      ctx.throw(422, 'Missing contract id.');
    }
    if (!isTxIdValid(contractId)) {
      ctx.throw(400, 'Invalid tx format');
    }
    if (!query) {
      ctx.throw(422, 'Missing query');
    }

    const queryResult = await queryLastState(contractId, query);

    ctx.body = { ...queryResult, contractTxId: contractId };
    ctx.status = 200;
  } catch (e) {
    logger.error(`Query state request failed, contractId ${contractId}, query ${query} `);
    ctx.status = e.status || 500;
    ctx.body = { message: e.message };
  }
};
