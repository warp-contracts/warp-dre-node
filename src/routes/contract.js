const { JSONPath } = require('jsonpath-plus');
const {
  getContractErrors,
  getContractValidity,
  getContractValidityTotalCount,
  getContractErrorMessages,
  getSignatures
} = require('../db/nodeDb');
const { LoggerFactory } = require('warp-contracts');
const { warp } = require('../warp');
const { signState } = require('../signature');

const MAX_VALIDITY_PER_PAGE = 1000;
const DEFAULT_VALIDITY_PER_PAGE = 15;

const registrationStatus = {
  'not-registered': 'not-registered',
  registered: 'registered',
  evaluated: 'evaluated',
  error: 'error',
  blacklisted: 'blacklisted'
};

LoggerFactory.INST.logLevel('debug', 'contractsRoute');
const logger = LoggerFactory.INST.create('contractsRoute');

module.exports = async (ctx) => {
  const { page, limit, query, id: contractId } = ctx.query;
  const parsedPage = page ? parseInt(page) : 1;
  const parsedLimit = limit ? Math.min(parseInt(limit), MAX_VALIDITY_PER_PAGE) : DEFAULT_VALIDITY_PER_PAGE;
  const offset = parsedPage ? (parsedPage - 1) * parsedLimit : 0;

  const showState = ctx.query.state !== 'false';
  const showValidity = ctx.query.validity === 'true';
  const showErrorMessages = ctx.query.errorMessages === 'true';
  const showErrors = ctx.query.errors === 'true';
  const showValidityCount = ctx.query.validityCount === 'true';

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
        const contractValidity = await getContractValidity(contractId, result.sortKey, parsedLimit, offset);
        response.validity = contractValidity.validity;
        response.paging = {
          limit: parsedLimit,
          items: contractValidity.count,
          page: parsedPage
        };
      }
      if (showValidityCount) {
        response.validityCount = await getContractValidityTotalCount(contractId, result.sortKey);
      }
      if (showErrorMessages) {
        const contractErrorMessages = await getContractErrorMessages(contractId, result.sortKey, parsedLimit, offset);
        response.errorMessages = contractErrorMessages.errorMessages;
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
