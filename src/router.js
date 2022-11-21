const Router = require("@koa/router");
const state = require('./routes/state');
const status = require('./routes/status');
const blacklisted = require('./routes/blacklisted');
const cached = require('./routes/cached');
const errors = require('./routes/errors');

const router = new Router();

router.get("/state", state);
router.get("/status", status);
router.get("/blacklist", blacklisted);
router.get("/cached", cached);
router.get("/errors", errors);

module.exports = router;