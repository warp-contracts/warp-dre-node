const { LoggerFactory } = require('warp-contracts');

module.exports = (name) => {
  LoggerFactory.INST.logLevel('error');
  LoggerFactory.INST.logLevel('debug', 'listener');
  const logger = LoggerFactory.INST.create(name);
  return logger;
};
