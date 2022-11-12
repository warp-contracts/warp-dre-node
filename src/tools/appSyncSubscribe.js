const {initPubSub, subscribe} = require("warp-contracts-pubsub");
global.WebSocket = require('ws');

initPubSub();
async function sub() {
  const subscription = await subscribe('Daj-MNSnH55TDfxqC7v4eq0lKzVIwh98srUaWqyuZtY', ({data}) => {
    console.log(' ==== new message ==== ');
    console.dir(data);
  }, console.error);
  console.log('waiting for messages...');
}

sub().then().catch((e) => {
  console.error(e);
})





