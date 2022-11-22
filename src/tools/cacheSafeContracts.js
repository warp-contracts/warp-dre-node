const Redis = require("ioredis");
const fs = require("fs");
const path = require("path");

(async () => {

  const rawContracts = fs.readFileSync(path.join('safeContracts.json'), "utf-8");
  let contracts =  JSON.parse(rawContracts);

  function readGwPubSubConfig() {
    const json = fs.readFileSync(path.join('.secrets', 'gw-pubsub.json'), "utf-8");
    return JSON.parse(json);
  }

  const connectionOptions = readGwPubSubConfig();

  const publisher = new Redis(connectionOptions);
  await publisher.connect();
  console.log(publisher.status)
  const channel = `contracts`;

  contracts = contracts.slice(0, 10);

  for (let contract of contracts) {
    console.log('Publishing', contract);
    const message = {contractTxId: contract.contract_id, test: false, interaction: {}};
    publisher.publish(channel, JSON.stringify(message));
    console.log("Published %s to %s", message, channel);
  }


})();