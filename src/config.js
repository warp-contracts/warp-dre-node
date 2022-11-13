const fs = require("fs");
const path = require("path");

module.exports = {
  readGwPubSubConfig: () => {
    return readConfig('gw-pubsub.json');
  },

  readApiKeysConfig: () => {
    return readConfig('api-keys.json');
  }
}

function readConfig(file) {
  const json = fs.readFileSync(path.join('.secrets', file), "utf-8");
  return JSON.parse(json);
}