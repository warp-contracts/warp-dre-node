const { LoggerFactory } = require("warp-contracts");
const loadInteractions = require("../loadInteractions");
const { hashElement } = require("../signature");
const updateProcessor = require("./updateProcessor");
const { insertSyncLog } = require("../db/nodeDb");
const { isTxIdValid } = require("../common");
const { partition } = require("./common");

const logger = LoggerFactory.INST.create("syncer");
LoggerFactory.INST.logLevel("info", "syncer");

function validate(entries) {
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry.contractTxId || !isTxIdValid(entry.contractTxId)) {
      throw new Error(`No valid 'contractTxId' in entry: ${JSON.stringify(entry)}`);
    }
    if (!entry.sortKey) {
      throw new Error(`No 'sortKey' in entry: ${JSON.stringify(entry)}`);
    }
    if (!entry.interaction) {
      throw new Error(`No 'interaction' in entry: ${JSON.stringify(entry)}`);
    }
    if (entry.interaction.sortKey != entry.sortKey) {
      throw new Error(`sortKey wrongly set: ${JSON.stringify(entry)}`);
    }

    // note: entry.lastSortKey = null means that it's a very first interaction with this contract
    if (entry.lastSortKey === undefined) {
      throw new Error(`No 'lastSortKey' in entry: ${JSON.stringify(entry)}`);
    }
  }
}

function sort(entries) {
  entries.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

function logPartitionData(partitioned) {
  logger.info("Partitions length", partitioned.length);
  if (partitioned.length > 0) {
    const partitionsData = {};
    partitioned.forEach((p, index) => {
      partitionsData[index] = p.length;
    });
    logger.info("Partitions", partitionsData);
  }
}

module.exports = async function(
  nodeDb, whitelistedSources, initialStartTimestamp, windowSize, forceEndTimestamp, signatureQueue) {

  let startTimestamp = initialStartTimestamp;

  (function workerLoop() {
    setTimeout(async function() {
      const endTimestamp = forceEndTimestamp ? forceEndTimestamp : startTimestamp + windowSize;
      logger.info(`====== Loading interactions for`, {
        startTimestamp,
        endTimestamp,
        fromDate: new Date(startTimestamp),
        toDate: new Date(endTimestamp)
      });

      let result;
      try {
        result = await loadInteractions(startTimestamp, endTimestamp, whitelistedSources);
        // logger.info("Raw response", result);
        if (!result) {
          throw new Error("Result is null or undefined");
        }
        if (!result.interactions) {
          throw new Error("Result does not contain 'interactions' field");
        }
        validate(result.interactions);
      } catch (e) {
        logger.error("Error while loading interactions", {
          startTimestamp, endTimestamp
        }, e);

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
      logger.info("Loaded interactions info", {
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
        // validatePartition(partition);
        try {
          await updateProcessor({
            data: {
              contractTxId: partition[0].contractTxId,
              isTest: false,
              partition,
              signatureQueue
            },

          });
        } catch (e) {
          logger.error(e);
          evaluationErrors[`${partition[0].contractTxId}|${partition[0].interaction.id}`] = {
            error: e?.toString()
          };
          if (e.name == "CacheConsistencyError") {
            logger.warn("Cache consistency error, stopping node!");
            process.exit(0);
          }
        }
      }

      logger.info("====== Update completed");

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
        await insertSyncLog(nodeDb, syncLogData);
      } catch (e) {
        logger.error("Error while storing sync log for", syncLogData);
        logger.error(e);
        // brutal...
        process.exit(0);
      }

      startTimestamp = endTimestamp;

      logger.info(`====== Loading interactions end.`);

      if (windowSize) {
        workerLoop();
      }
    }, 1000);
  })();
};
