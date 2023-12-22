const { getContractErrors, drePool } = require('../db/nodeDb');
const { isTxIdValid } = require('../common');

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
    const result = await getValidity(id);
    if (!result) {
      const contractErrors = await getContractErrors(contractId);

      if (contractErrors.length) {
        response.contractErrors = contractErrors;
      } else {
        ctx.throw(404, 'No info about the transaction.');
      }
    }
    if (result.key !== contractId) {
      ctx.throw(404, 'Interaction cannot be found in contract interactions.');
    }
    response.validity = result.validity;
    if (result.error_message) {
      response.errorMessages = result.error_message;
    }
    ctx.body = response;
  } catch (e) {
    ctx.body = e.message;
    ctx.status = e.status || 500;
  }
};

async function getValidity(id) {
  const result = await drePool.query(
    `select tx_id, key, valid as validity, error_message from warp.validity where tx_id = $1;`,
    [id]
  );
  if (result && result.rows && result.rows.length > 0) {
    return result.rows[0];
  }
  return null;
}
