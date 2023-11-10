const { defaultCacheOptions, WarpFactory } = require('warp-contracts');
const { LmdbCache } = require('warp-contracts-lmdb');
const { NlpExtension } = require('warp-contracts-plugin-nlp');
const { EvaluationProgressPlugin } = require('warp-contracts-evaluation-progress-plugin');
const { EventEmitter } = require('node:events');
const { getFailures, drePool } = require('./db/nodeDb');
const warpDbConfig = require('../postgresConfigWarpDb.js');
const { EthersExtension } = require('warp-contracts-plugin-ethers');
const { EvmSignatureVerificationServerPlugin } = require('warp-contracts-plugin-signature/server');
const { ContractBlacklistPlugin, getDreBlacklistFunction } = require('warp-contracts-plugin-blacklist');
const { config } = require('./config');
const { VM2Plugin } = require('warp-contracts-plugin-vm2');
const { VRFPlugin } = require('warp-contracts-plugin-vrf');
const { JWTVerifyPlugin } = require('@othent/warp-contracts-plugin-jwt-verify');
const { PgContractCache, PgSortKeyCache } = require('warp-contracts-postgres');

const eventEmitter = new EventEmitter();

const pgClient = new PgContractCache(warpDbConfig);

const warp = WarpFactory.forMainnet()
  .useGwUrl(config.gwUrl)
  .useStateCache(pgClient)
  .useContractCache(
    new LmdbCache(
      {
        ...defaultCacheOptions,
        dbLocation: `./cache/warp/lmdb/contract`
      },
      {
        minEntriesPerContract: 1,
        maxEntriesPerContract: 5
      }
    ),
    new LmdbCache(
      {
        ...defaultCacheOptions,
        dbLocation: `./cache/warp/lmdb/source`
      },
      {
        minEntriesPerContract: 1,
        maxEntriesPerContract: 5
      }
    )
  )
  .useKVStorageFactory(
    (contractTxId) =>
      new PgSortKeyCache({
        ...warpDbConfig,
        schemaName: 'kv',
        tableName: contractTxId,
        minEntriesPerKey: 1000,
        maxEntriesPerKey: 10000,
        application_name: 'kv'
      })
  )
  .use(new EvaluationProgressPlugin(eventEmitter, 500))
  .use(new NlpExtension())
  .use(new EvmSignatureVerificationServerPlugin())
  .use(new EthersExtension())
  .use(new VM2Plugin())
  .use(new VRFPlugin())
  .use(new JWTVerifyPlugin())
  .use(
    new ContractBlacklistPlugin(async (input) => {
      const blacklistFunction = await getDreBlacklistFunction(getFailures, drePool, config.workersConfig.maxFailures);
      return await blacklistFunction(input);
    })
  );
warp.whoAmI = config.dreName || 'DRE';

module.exports = { warp, pgClient };
