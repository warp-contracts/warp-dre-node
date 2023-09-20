const { config } = require('../config');
const { LoggerFactory } = require('warp-contracts');
const { Queue } = require('bullmq');
const { getAllContractsIds } = require('../db/nodeDb');

const logger = LoggerFactory.INST.create('scheduleContractsDreSync');
const isTestInstance = config.env === 'test';

module.exports = async (ctx) => {
  if (!config.foreignDres || Object.keys(config.foreignDres).length < 1) {
    logger.info('Cannot sync with remote dres, config missing');
    ctx.body = 'Foreign DREs sync functionality is disabled';
    ctx.status = 404;
    return;
  }

  const foreignDre = ctx.query.dre;
  if (!foreignDre || !config.foreignDres[foreignDre]) {
    logger.info('Cannot sync with remote dre, invalid name');
    ctx.body = `${foreignDre} not recognized, maybe try: /sync-contracts?dre=dreu&size=2`;
    ctx.status = 400;
    return;
  }

  const { nodeDb } = ctx;
  const size = ctx.query.size;

  try {
    const difference = await Promise.all([fetchRemoteContracts(foreignDre), getAllContractsIds(nodeDb)]).then(
      ([foreign, local]) => foreign.ids.filter((x) => !local.ids.includes(x))
    );

    const registerQueue = new Queue('register', {
      connection: config.bullMqConnection,
      defaultJobOptions: {
        removeOnComplete: {
          age: 3600
        },
        removeOnFail: true
      }
    });

    let i = 0;
    const limit = size || difference.length;
    const scheduled = [];
    while (i < limit && difference.length > 0) {
      i++;
      const contractTxId = difference.pop();
      const baseMessage = {
        contractTxId,
        appSyncKey: config.appSync.key,
        test: isTestInstance
      };
      const jobId = contractTxId;
      await registerQueue.add(
        'initContract',
        {
          ...baseMessage,
          publishContract: false,
          initialState: {}
        },
        { jobId }
      );
      scheduled.push(contractTxId);
    }

    ctx.body = {
      message: `Scheduled ${i} contracts for registration from ${config.foreignDres[foreignDre]}, left: ${difference.length}`,
      contracts: scheduled
    };
    ctx.status = 200;
  } catch (e) {
    ctx.body = e.message;
    ctx.status = 500;
  }
};

async function fetchRemoteContracts(foreignDre) {
  const foreignDreLink = `https://${config.foreignDres[foreignDre]}/cached`;
  logger.info(`Calling ${foreignDreLink} to sync contracts`);
  const result = await fetch(foreignDreLink);
  if (!result.ok) {
    throw new Error(`Wrong response for `);
  }
  return await result.json();
}
