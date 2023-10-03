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

const registrationStatus = {
  'not-registered': 'not-registered',
  registered: 'registered',
  evaluated: 'evaluated',
  error: 'error',
  blacklisted: 'blacklisted'
};

LoggerFactory.INST.logLevel('debug', 'contractsRoute');
const logger = LoggerFactory.INST.create('contractsRoute');

class NoContractError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NoContractError';
  }
}

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
      const sign = await getSignatures(contractId, result.sortKey);
      response.sortKey = result.sortKey;
      response.signature = sign.signature;
      response.stateHash = sign.state_hash;
    } else {
      const contractErrors = await getContractErrors(contractId);
      if (contractErrors.length) {
        response.status = registrationStatus['error'];
        response.errors = contractErrors;
      } else {
        throw new NoContractError('No info about contract');
      }
    }

    ctx.body = response;
    ctx.status = 200;
  } catch (e) {
    logger.error(e);
    if (e.name === 'NoContractError') {
      ctx.status = 404;
    } else {
      ctx.status = 500;
    }
    ctx.body = e.message;
  }
};
