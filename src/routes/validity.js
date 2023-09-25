const { getContractErrors } = require('../db/nodeDb');
const { isTxIdValid, getContractState } = require('../common');
const LRUCache = require('../lruCache');

const validityCache = new LRUCache(20);

module.exports = async (ctx) => {
  const id = ctx.query.id;
  const contractId = ctx.query.contractId;
  let response = {};

  if (!id || !contractId) {
    ctx.throw(400, 'Id and contract id must be provided.');
  }

  if (!isTxIdValid(id)) {
    ctx.throw(400, 'Interaction id not valid.');
  }

  if (!isTxIdValid(contractId)) {
    ctx.throw(400, 'Contract id not valid.');
  }

  try {
    const contractValidity = validityCache.get(contractId);

    if (contractValidity && id in contractValidity.interactions) {
      response = getInteractionValidityAndErrorMessage(contractValidity, id);
    } else {
      const { result, parsed } = await getContractState(contractId);

      if (result) {
        const contractValidity = {
          interactions: parsed ? result.validity : JSON.parse(result.validity),
          errorMessages: parsed ? result.error_messages : JSON.parse(result.error_messages)
        };
        validityCache.put(contractId, contractValidity);

        if (id in contractValidity.interactions) {
          response = getInteractionValidityAndErrorMessage(contractValidity, id);
        } else {
          ctx.throw(404, 'Interaction cannot be found in contract interactions.');
        }
      } else {
        const contractErrors = await getContractErrors(contractId);

        if (contractErrors.length) {
          response.contractErrors = contractErrors;
        } else {
          ctx.throw(404, 'No info about the contract.');
        }
      }
    }
    ctx.body = response;
  } catch (e) {
    ctx.body = e.message;
    ctx.status = e.status || 500;
  }
};

function getInteractionValidityAndErrorMessage(contractValidity, id) {
  const response = {};
  response.validity = contractValidity.interactions[id];

  if (response.validity == false && id in contractValidity.errorMessages) {
    response.errorMessage = contractValidity.errorMessages[id];
  }

  return response;
}
