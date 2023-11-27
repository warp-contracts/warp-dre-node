const { JSONPath } = require('jsonpath-plus');
const {
  getContractErrors,
  getContractValidity,
  countContractValidity,
  getContractErrorMessages,
  getSignatures
} = require('../db/nodeDb');
const { LoggerFactory } = require('warp-contracts');
const { warp } = require('../warp');
const { signState } = require('../signature');

const registrationStatus = {
  'not-registered': 'not-registered',
  registered: 'registered',
  evaluated: 'evaluated',
  error: 'error',
  blacklisted: 'blacklisted'
};

LoggerFactory.INST.logLevel('debug', 'contractsRoute');
const logger = LoggerFactory.INST.create('contractsRoute');
LoggerFactory.INST.logLevel("error", "HandlerExecutorFactory");

module.exports = async (ctx) => {
  const contractId = ctx.query.id;
  const showState = ctx.query.state !== 'false';
  const showValidity = ctx.query.validity === 'true';
  const showErrorMessages = ctx.query.errorMessages === 'true';
  const showErrors = ctx.query.errors === 'true';
  const query = ctx.query.query;

  logger.info("New 'contract' request", {
    contractId,
    showState,
    showValidity
  });

  try {
    const response = {};

    const result = await warp.stateEvaluator.latestAvailableState(contractId);
    if (result) {
      response.status = registrationStatus['evaluated'];
      response.contractTxId = contractId;
      if (query) {
        response.result = JSONPath({ path: query, json: result.cachedValue.state });
      } else {
        if (showState) {
          response.state = result.cachedValue.state;
        }
      }
      if (showValidity) {
        response.validity = await getContractValidity(contractId, result.sortKey);
      }
      response.validityCount = await countContractValidity(contractId, result.sortKey);
      if (showErrorMessages) {
        response.errorMessages = await getContractErrorMessages(contractId, result.sortKey);
      }
      if (showErrors) {
        response.errors = await getContractErrors(contractId);
      }
      const { sig, stateHash } = await signatures(contractId, result.sortKey, result.cachedValue.state);
      response.sortKey = result.sortKey;
      response.signature = sig;
      response.stateHash = stateHash;
    } else {
      const contractErrors = await getContractErrors(contractId);
      if (contractErrors.length) {
        response.status = registrationStatus['error'];
        response.errors = contractErrors;
      } else {
        ctx.throw(404, 'No info about contract');
      }
    }

    ctx.body = response;
    ctx.status = 200;
  } catch (e) {
    logger.error(e);
    ctx.status = e.status || 500;
    ctx.body = e.message;
  }
};

async function signatures(contractTxId, sortKey, state) {
  const dbSignatures = await getSignatures(contractTxId, sortKey);
  if (!dbSignatures || !dbSignatures.sig) {
    return await signState(contractTxId, sortKey, state);
  }
  return dbSignatures;
}
