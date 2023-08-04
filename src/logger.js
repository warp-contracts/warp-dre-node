const { LoggerFactory } = require('warp-contracts');

module.exports = (name) => {
  LoggerFactory.INST.logLevel('error');

  const logger = LoggerFactory.INST.create(name);
  LoggerFactory.INST.logLevel('debug', 'listener');
  LoggerFactory.INST.logLevel('debug', 'interactionsProcessor');
  LoggerFactory.INST.logLevel('debug', "EvaluationProgressPlugin");
  LoggerFactory.INST.logLevel('debug', "WarpGatewayInteractionsLoader");
  return logger;
};
