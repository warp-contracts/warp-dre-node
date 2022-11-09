const warp = require('../warp');

module.exports = async (ctx) => {
  const contractId = ctx.query.id;
  const showValidity = ctx.query.validity === 'true';
  const showErrorMessages = ctx.query.errorMessages === 'true';

  try {
    const response = {};
    const result = await warp.stateEvaluator.latestAvailableState(contractId);
    if (result) {
      response.sortKey = result.sortKey;
      response.state = result.cachedValue.state;
      if (showValidity) {
        response.validity = result.cachedValue.validity;
      }

      if (showErrorMessages) {
        response.errorMessages = result.cachedValue.errorMessages;
      }
    } else {
      response.message = 'Contract not cached';
    }
    ctx.body = response;
    ctx.status = 200;
  } catch (e) {
    ctx.body = e.message;
    ctx.status = 500;
  }

};
