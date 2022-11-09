const Redis = require("ioredis");
const fs = require("fs");
const path = require("path");

(async () => {

  function readGwPubSubConfig() {
    const json = fs.readFileSync(path.join('.secrets', 'gw-pubsub.json'), "utf-8");
    return JSON.parse(json);
  }

  const connectionOptions = readGwPubSubConfig();

  const publisher = new Redis(connectionOptions);
  await publisher.connect();
  console.log(publisher.status)

  setInterval(() => {
    const message = { contractTxId: 'Daj-MNSnH55TDfxqC7v4eq0lKzVIwh98srUaWqyuZtY', test: true };
    const channel = `contracts`;

    publisher.publish(channel, JSON.stringify(message));
    console.log("Published %s to %s", message, channel);
  }, 1000);
})();