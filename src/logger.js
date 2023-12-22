const { LoggerFactory } = require('warp-contracts');

module.exports = (name) => {
  LoggerFactory.INST.logLevel('info');
  LoggerFactory.INST.logLevel('debug', name);
  const logger = LoggerFactory.INST.create(name);
  return logger;
};
