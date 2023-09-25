const { config } = require('../config');
const { LoggerFactory } = require('warp-contracts');
const { getAllContractsIds } = require('../db/nodeDb');

const logger = LoggerFactory.INST.create('scheduleContractsDreSync');
const isTestInstance = config.env === 'test';

/**
 * Schedule initial state registration of missing contracts.
 * Contracts will be evaluated using genesis sort key.
 * No interactions will be taken into account.
 * Missing interactions are defined by fetching contracts from foreign DRE
 * and comparing to local data.
 */
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
    ctx.body = `${foreignDre} not recognized, maybe try: /contract/initial-registration?dre=dreu&limit=2`;
    ctx.status = 400;
    return;
  }

  const { registerQueue } = ctx;

  try {
    const difference = await Promise.all([fetchRemoteContracts(foreignDre), getAllContractsIds()]).then(
      ([foreign, local]) => foreign.ids.filter((x) => !local.ids.includes(x))
    );

    const limit = ctx.query.limit || difference.length;
    const scheduled = [];
    while (scheduled.length < limit && difference.length > 0) {
      const contractTxId = difference.pop();
      const baseMessage = {
        contractTxId,
        appSyncKey: config.appSync.key,
        test: isTestInstance
      };
      await registerQueue.add(
        'initContract',
        {
          ...baseMessage,
          requiresPublish: false,
          initialState: {}
        },
        { jobId: contractTxId }
      );
      scheduled.push(contractTxId);
    }

    ctx.body = {
      message: `Scheduled ${scheduled.length} contracts for registration from ${config.foreignDres[foreignDre]}, left: ${difference.length}`,
      contracts: scheduled
    };
    ctx.status = 200;
  } catch (e) {
    ctx.body = e.message;
    ctx.status = 500;
  }
};

async function fetchRemoteContracts(foreignDre) {
  const foreignDreLink = `https://${config.foreignDres[foreignDre]}/cached?ids=true`;
  logger.info(`Calling ${foreignDreLink} to sync contracts`);
  const result = await fetch(foreignDreLink);
  if (!result.ok) {
    throw new Error(`Failed call: ${foreignDreLink} `);
  }
  return await result.json();
}
