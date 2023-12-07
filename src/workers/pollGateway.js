const { LoggerFactory } = require('warp-contracts');
const loadInteractions = require('../loadInteractions');
const { hashElement } = require('../signature');
const pollProcessor = require('./pollProcessor');
const { insertSyncLog } = require('../db/nodeDb');
const { isTxIdValid } = require('../common');
const { partition } = require('./common');
const { config } = require('../config');
const { init } = require('./pollWorkerRunner');

const logger = LoggerFactory.INST.create('syncer');
LoggerFactory.INST.logLevel('info', 'syncer');

function filterInvalidEntries(entries, responseSizeLimit) {
  if (entries.length >= responseSizeLimit) {
    logger.warn(`Max entries in response (${responseSizeLimit}), either reduce window size or increase interactions limit in response via the .env.POLL_RESPONSE_LENGTH_LIMIT`);
    process.exit(0);
  }

  const validEntries = entries.filter((entry) => {
    if (!entry.contractTxId || !isTxIdValid(entry.contractTxId)) {
      logger.warn(`No valid 'contractTxId' in entry: ${JSON.stringify(entry)}`);
      return false;
    }
    if (!entry.sortKey) {
      logger.warn(`No 'sortKey' in entry: ${JSON.stringify(entry)}`);
      return false;
    }
    if (!entry.interaction) {
      logger.warn(`No 'interaction' in entry: ${JSON.stringify(entry)}`);
      return false;
    }
    if (entry.interaction.sortKey != entry.sortKey) {
      logger.warn(`sortKey wrongly set: ${JSON.stringify(entry)}`);
      return false;
    }

    // note: entry.lastSortKey = null means that it's a very first interaction with this contract
    if (entry.lastSortKey === undefined) {
      logger.warn(`No 'lastSortKey' in entry: ${JSON.stringify(entry)}`);
      return false;
    }

    return true;
  });

  return validEntries;
}

function sort(entries) {
  entries.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

function logPartitionData(partitioned) {
  logger.info('Partitions length', partitioned.length);
  if (partitioned.length > 0) {
    const partitionsData = {};
    partitioned.forEach((p, index) => {
      partitionsData[index] = { contract: p[0].contractTxId, length: p.length };
    });
    logger.info('Partitions', partitionsData);
  }
}

module.exports = async function (
  whitelistedSources,
  blacklistedContracts,
  initialStartTimestamp,
  windowsMs,
  forceEndTimestamp,
  blacklistFn,
  isBlacklisted
) {
  let startTimestamp = initialStartTimestamp;
  let pollRunner = null;
  if (config.pollForkProcess) {
    pollRunner = init();
  }

  (function workerLoop(delay = 1_000) {
    setTimeout(async function () {
      let windowSize = windowSizeMs(startTimestamp, windowsMs);
      const endTimestamp = forceEndTimestamp ? forceEndTimestamp : startTimestamp + windowSize;
      logger.info(`====== Loading interactions for`, {
        startTimestamp,
        endTimestamp,
        windowSize,
        fromDate: new Date(startTimestamp),
        toDate: new Date(endTimestamp)
      });

      let result;
      try {
        result = await loadInteractions(
          startTimestamp,
          endTimestamp,
          whitelistedSources,
          blacklistedContracts,
          config.pollResponseLengthLimit
        );
        if (!result) {
          throw new Error('Result is null or undefined');
        }
        if (!result.interactions) {
          throw new Error("Result does not contain 'interactions' field");
        }
        result.interactions = filterInvalidEntries(result.interactions, config.pollResponseLengthLimit);
      } catch (e) {
        logger.error(
          'Error while loading interactions',
          {
            startTimestamp,
            endTimestamp
          },
          e
        );

        // we're assuming that's due to some issue on backend side
        // - so no 'startTimestamp' update here
        if (windowSize) {
          workerLoop();
          return;
        }
      }

      const interactions = result.interactions;
      const responseHash = hashElement(interactions);
      const resultLength = interactions.length;
      const firstSortKey = resultLength ? interactions[0].sortKey : null;
      const lastSortKey = resultLength ? interactions[resultLength - 1].sortKey : null;
      logger.info('Loaded interactions info', {
        startTimestamp,
        endTimestamp,
        responseHash,
        resultLength,
        firstSortKey,
        lastSortKey
      });

      let evaluationErrors = {};

      // just in case stringify/parse during http communication would fuck up the order...
      sort(interactions);

      const partitioned = partition(interactions);
      logPartitionData(partitioned);

      const partitionsLength = partitioned.length;

      for (let i = 0; i < partitionsLength; i++) {
        const partition = partitioned[i];
        const contractTxId = partition[0].contractTxId;
        const blacklisted = await isBlacklisted(contractTxId);
        if (blacklisted) {
          logger.warn(`Contract ${contractTxId} is blacklisted, skipping`);
          continue;
        }
        // validatePartition(partition);
        try {
          const data = {
            data: {
              contractTxId,
              isTest: false,
              partition,
              isSubscription: false
            }
          };
          if (pollRunner) {
            await pollRunner.exec(data);
          } else {
            await pollProcessor(data);
          }
        } catch (e) {
          logger.error(e);
          evaluationErrors[`${contractTxId}|${partition[0].interaction.id}`] = {
            error: e?.toString()
          };
          const mes = e.message?.toString() || '';
          switch (e.name) {
            case 'CacheConsistencyError':
              logger.warn('Cache consistency error', contractTxId);
              break;
            case 'ReplyError':
              logger.warn('Redis failure. Retry after delay', contractTxId, e);
              workerLoop(8_000);
              return;
            case 'NetworkCommunicationError':
              if (mes.includes('Error during network communication') || mes.includes('429')) {
                logger.warn('Temporary network problems. Retry after delay', contractTxId, e);
                workerLoop(8_000);
                return;
              }
              break;
          }
          if (mes.includes('[MaxStateSizeError]')) {
            logger.warn('Max state size reached', contractTxId);
          }
          if (!config.whitelistMode) {
            logger.warn('Blacklisting contract', { contractTxId, reason: e.message });
            await blacklistFn(contractTxId, e?.toString());
          }
        }
      }

      logger.info('====== Update completed');

      const syncLogData = {
        start_timestamp: startTimestamp,
        end_timestamp: endTimestamp,
        response_length: resultLength,
        response_hash: responseHash,
        response_first_sortkey: firstSortKey,
        response_last_sortkey: lastSortKey,
        errors: JSON.stringify(evaluationErrors)
      };
      try {
        await insertSyncLog(syncLogData);
      } catch (e) {
        logger.error('Error while storing sync log for', syncLogData);
        logger.error(e);
        // brutal...
        process.exit(0);
      }

      startTimestamp = endTimestamp; // jezeli jest network communication error to nie robmy tego

      logger.info(`====== Loading interactions end.`);

      if (windowSize) {
        workerLoop();
      }
    }, delay);
  })();
};

function windowSizeMs(startTimestamp, windowsMs) {
  const lastIndex = windowsMs.length - 1;
  for (let i = 0; i < lastIndex; i++) {
    const startToNowDiff = Date.now() - startTimestamp;
    if (windowsMs[i] < startToNowDiff) {
      return windowsMs[i];
    }
  }

  return windowsMs[lastIndex];
}
