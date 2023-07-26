const { JSONPath } = require('jsonpath-plus');
const { getContractErrors, getFailures, events } = require('../db/nodeDb');
const { config } = require('../config');
const { getContractState } = require('../common');

const registrationStatus = {
  'not-registered': 'not-registered',
  registered: 'registered',
  evaluated: 'evaluated',
  error: 'error',
  blacklisted: 'blacklisted'
};

module.exports = async (ctx) => {
  const contractId = ctx.query.id;
  const showState = ctx.query.state !== 'false';
  const showValidity = ctx.query.validity === 'true';
  const showErrorMessages = ctx.query.errorMessages === 'true';
  const showErrors = ctx.query.errors === 'true';
  const showEvents = ctx.query.events === 'true';
  const query = ctx.query.query;
  const { nodeDb, nodeDbEvents } = ctx;

  try {
    const response = {};
    const failures = await getFailures(nodeDb, contractId);
    const blacklisted = Number.isInteger(failures) && failures > config.workersConfig.maxFailures - 1;

    if (blacklisted) {
      response.status = registrationStatus['blacklisted'];
      response.errors = await getContractErrors(nodeDb, contractId);
    } else {
      const { result, parsed } = await getContractState(contractId, nodeDb);
      if (result) {
        response.status = registrationStatus['evaluated'];
        response.contractTxId = contractId;
        if (query) {
          response.result = JSONPath({ path: query, json: JSON.parse(result.state) });
        } else {
          if (showState) {
            response.state = parsed ? result.state : JSON.parse(result.state);
          }
        }
        const parsedValidity = parsed ? result.validity : JSON.parse(result.validity);
        if (showValidity) {
          response.validity = parsedValidity;
        }
        response.validityCount = Object.keys(parsedValidity).length;
        if (showErrorMessages) {
          response.errorMessages = parsed ? result.error_messages : JSON.parse(result.error_messages);
        }
        if (showErrors) {
          response.errors = await getContractErrors(nodeDb, contractId);
        }
        response.sortKey = result.sort_key;
        response.timestamp = result.timestamp;
        response.signature = result.signature;
        response.stateHash = result.state_hash;
        response.manifest = parsed ? result.manifest : JSON.parse(result.manifest);
      } else {
        const contractErrors = await getContractErrors(nodeDb, contractId);
        if (contractErrors.length) {
          response.status = registrationStatus['error'];
          response.errors = contractErrors;
        } else {
          throw new Error('No info about contract');
        }
      }
    }
    if (showEvents) {
      response.events = await events.loadForContract(nodeDbEvents, contractId);
    }
    ctx.body = response;
    ctx.status = 200;
  } catch (e) {
    ctx.body = e.message;
    ctx.status = 500;
  }
};
