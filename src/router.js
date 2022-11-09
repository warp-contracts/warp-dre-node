const Router = require("@koa/router");
const state = require('./routes/state');


const router = new Router();

//nodeRouter.get("/ehlo", ehloRoute);
router.get("/state", state);
// nodeRouter.get("/schedule-update", scheduleUpdate);

//nodeRouter.get("/balances", walletBalances);
//nodeRouter.get("/all-states", allStates);

module.exports = router;