const { warp } = require('../warp');
const { config } = require('../config');
const { getCachedViewState, insertViewStateIntoCache } = require('../db/nodeDb');
const { isTxIdValid } = require('../common');
const { emptyTransfer, LoggerFactory } = require('warp-contracts');

LoggerFactory.INST.logLevel('debug', 'viewStateRoute');
const logger = LoggerFactory.INST.create('viewStateRoute');

module.exports = async (ctx) => {
  logger.info("new view state request", ctx.query);
  if (!config.availableFunctions.viewState) {
    ctx.body = 'Contract view state functionality is disabled';
    ctx.status = 404;
    return;
  }

  try {
    const contractId = ctx.query.id;
    if (!contractId) {
      ctx.throw(422, 'Missing contract id.');
    }
    if (!isTxIdValid(contractId)) {
      ctx.throw(400, 'Invalid tx format');
    }
    if (!ctx.query.input) {
      ctx.throw(422, 'Missing input');
    }
    const input = parseInput(ctx.query.input);
    if (!input) {
      ctx.throw(400, 'Invalid input format');
    }
    logger.info("new view state request after validation");
    const caller = ctx.query.caller;

    let output;
    let sortKey = (await warp.stateEvaluator.latestAvailableState(contractId)).sortKey;
    logger.info("Latest available sortKey", sortKey);


    let cachedView = (await getCachedViewState(contractId, sortKey, JSON.stringify(input), caller))[0];

    logger.info("new view state request after cache lookup", sortKey);

    if (cachedView) {
      logger.debug("VieState cached");
      output = JSON.parse(cachedView.result);
    } else {
      logger.info("new view state request before viewState", sortKey);
      const interactionResult = await warp.contract(contractId)
        .setEvaluationOptions(config.evaluationOptions)
        .viewState(input, [], emptyTransfer, caller);
      logger.info("new view state request after viewState", sortKey);
      sortKey = (await warp.stateEvaluator.latestAvailableState(contractId)).sortKey;

      logger.info("Interaction result", interactionResult);

      output = {
        type: interactionResult.type,
        result: interactionResult.result,
        caller: caller,
        error: interactionResult.error,
        errorMessage: interactionResult.errorMessage
      };
      cachedView = await insertViewStateIntoCache(contractId, sortKey, input, output, caller);
    }

    ctx.body = { ...output, sortKey, signature: cachedView.signature, hash: cachedView.view_hash };
    ctx.status = 200;
  } catch (e) {
    ctx.status = e.status || 500;
    ctx.body = { message: e.message };
  }
};

function parseInput(input) {
  try {
    return JSON.parse(decodeURIComponent(input));
  } catch (e) {
    return null;
  }
}
