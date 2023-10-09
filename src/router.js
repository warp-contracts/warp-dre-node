const Router = require('@koa/router');
const contract = require('./routes/contract');
const status = require('./routes/status');
const contractViewState = require('./routes/contractViewState');
const blacklisted = require('./routes/blacklisted');
const cached = require('./routes/cached');
const errors = require('./routes/errors');
const scheduleSync = require('./routes/scheduleSync');
const scheduleIinitialContractsRegistration = require('./routes/scheduleIinitialContractsRegistration');
const kv = require('./routes/kv');
const eraseContract = require('./routes/eraseContract');
const validity = require('./routes/validity');
const { walletBalances } = require('./routes/agg/aggBalances');
const { interactions } = require('./routes/agg/aggInteractionsByIndex');
const { taggedNftByOwner } = require('./routes/agg/aggTaggedNftByOwner');
const alive = require('./routes/alive');
const syncLog = require('./routes/syncLog');

const router = new Router();

router.get('/balances', walletBalances);
router.get('/interactions-by-indexes', interactions);
router.get('/nft-by-owner', taggedNftByOwner);
router.get('/contract', contract);
router.get('/alive', alive);
router.get('/contract/view-state', contractViewState);
router.get('/status', status);
router.get('/blacklist', blacklisted);
router.get('/cached', cached);
router.get('/errors', errors);
router.get('/sync', scheduleSync);
router.get('/contract/initial-registration', scheduleIinitialContractsRegistration);
router.get('/kv', kv);
router.get('/validity', validity);
router.get('/sync-log', syncLog);
router.delete('/contract/:id', eraseContract);

module.exports = router;
