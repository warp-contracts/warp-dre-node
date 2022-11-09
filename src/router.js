const Router = require("@koa/router");
const state = require('./routes/state');
const queue = require('./routes/queue');

const router = new Router();

//nodeRouter.get("/ehlo", ehloRoute);
router.get("/state", state);
router.get("/queue", queue);
// nodeRouter.get("/schedule-update", scheduleUpdate);

//nodeRouter.get("/balances", walletBalances);
//nodeRouter.get("/all-states", allStates);

module.exports = router;