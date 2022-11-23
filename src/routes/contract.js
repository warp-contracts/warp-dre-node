const {JSONPath} = require('jsonpath-plus');
const {getLastState, getContractErrors, getFailures, events} = require("../db/nodeDb");

const registrationStatus = {
  'not-registered': 'not-registered',
  'registered': 'registered',
  'evaluated': 'evaluated',
  'error': 'error',
  'blacklisted': 'blacklisted'
};

module.exports = async (ctx) => {
  const contractId = ctx.query.id;
  const showState = ctx.query.state !== 'false';
  const showValidity = ctx.query.validity === 'true';
  const showErrorMessages = ctx.query.errorMessages === 'true';
  const showEvents = ctx.query.events === 'true';
  const query = ctx.query.query;
  const {nodeDb, nodeDbEvents} = ctx;

  try {
    const response = {};
    const result = await getLastState(nodeDb, contractId);
    if (result) {
      response.status = registrationStatus['evaluated'];
      response.contractTxId = contractId;
      if (query) {
        response.result = JSONPath({path: query, json: JSON.parse(result.state)});
      } else {
        if (showState) {
          response.state = JSON.parse(result.state);
        }
      }
      if (showValidity) {
        response.validity = JSON.parse(result.validity);
      }
      if (showErrorMessages) {
        response.errorMessages = JSON.parse(result.error_messages);
      }
      response.sortKey = result.sort_key;
      response.timestamp = result.timestamp;
      response.signature = result.signature;
      response.stateHash = result.state_hash;
      response.manifest = JSON.parse(result.manifest);
    } else {
      const contractErrors = await getContractErrors(nodeDb, contractId);
      if (contractErrors.length) {
        response.status = registrationStatus['error'];
        response.errors = result;
      } else {
        const failures = await getFailures(nodeDb, contractId);

        if (Number.isInteger(failures) && failures > workersConfig.maxFailures - 1) {
          response.status = registrationStatus['blacklisted'];
          response.failures = failures;
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
