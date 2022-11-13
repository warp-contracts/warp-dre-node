const Router = require("@koa/router");
const state = require('./routes/state');
const queue = require('./routes/queue');

const router = new Router();

router.get("/state", state);
router.get("/queue", queue);

module.exports = router;