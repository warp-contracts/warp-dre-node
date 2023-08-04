const { LoggerFactory } = require("warp-contracts");
const loadInteractions = require("../loadInteractions");
const { hashElement } = require("../signature");
const updateProcessor = require("./updateProcessor");
const { insertSyncLog } = require("../db/nodeDb");

module.exports = async function(nodeDb, whitelistedSources, initialStartTimestamp, windowSize, forceEndTimestamp) {
  LoggerFactory.INST.logLevel("info");
  const logger = LoggerFactory.INST.create("syncer");
  LoggerFactory.INST.logLevel("info", "syncer");

  let startTimestamp = initialStartTimestamp;

  (function workerLoop() {
    setTimeout(async function() {
      const endTimestamp = forceEndTimestamp ? forceEndTimestamp : startTimestamp + windowSize;
      logger.info(`====== Loading interactions for`, {
        startTimestamp,
        endTimestamp,
        fromDate: new Date(startTimestamp)
      });
      let result;
      try {
        result = await loadInteractions(startTimestamp, endTimestamp, whitelistedSources);
        logger.info("Raw response", result);
        if (!result) {
          throw new Error("Result is null or undefined");
        }
      } catch (e) {
        logger.error("Error while loading interactions", {
          startTimestamp, endTimestamp
        }, e);

        // we're assuming that's due to some issue on backend side
        // - so no 'startTimestamp' update here
        return;
      }
      if (result && result.interactions) {
        const interactions = result.interactions;
        const responseHash = hashElement(interactions);
        const resultLength = interactions.length;
        const firstSortKey = resultLength ? interactions[0].sortKey : null;
        const lastSortKey = resultLength ? interactions[resultLength - 1].sortKey : null;
        logger.info("Loaded interactions info", {
          startTimestamp,
          endTimestamp,
          whitelistedSources,
          responseHash,
          resultLength,
          firstSortKey,
          lastSortKey
        });

        let evaluationErrors = {};

        for (let i = 0; i < resultLength; i++) {
          const interaction = interactions[i];
          try {
            await updateProcessor({
              data: {
                contractTxId: interaction.contractTxId,
                isTest: false,
                interaction: interaction.interaction
              }
            });
          } catch (e) {
            evaluationErrors[`${interaction.contractTxId}|${interaction.interaction.id}`] = {
              sortKey: interaction.sortKey,
              error: e?.toString()
            };
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
      }

      startTimestamp = endTimestamp;

      logger.info(`====== Loading interactions end.`);

      if (windowSize) {
        workerLoop();
      }
    }, 2000);
  })();
};
