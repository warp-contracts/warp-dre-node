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
  const message = {contractTxId: 'Daj-MNSnH55TDfxqC7v4eq0lKzVIwh98srUaWqyuZtY', test: true, initialState: {
      foo: 'x'.repeat(333*1024*1024)
    }};
  const channel = `contracts`;

  publisher.publish(channel, JSON.stringify(message));
  console.log("Published to %s", channel);
})();