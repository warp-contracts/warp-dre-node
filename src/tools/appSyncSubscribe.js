const { initPubSub, subscribe } = require('warp-contracts-pubsub');
const { diff, detailedDiff } = require('deep-object-diff');
global.WebSocket = require('ws');

initPubSub();
async function sub() {
  const contractTxId = 'KTzTXT_ANmF84fWEKHzWURD1LWd9QaFR9yfYUwH2Lxw';

  let prevState = {};

  const subscription = await subscribe(
    'states/DRE-BAZAR-1/KTzTXT_ANmF84fWEKHzWURD1LWd9QaFR9yfYUwH2Lxw',
    ({ data }) => {
      const newState = JSON.parse(data);
      console.log('\n ==== new message ==== ', newState.sortKey);
      console.log(new Date());
      //console.dir(newState);
      prevState = newState.state;
    },
    console.error
  );
  console.log('waiting for messages...', contractTxId);
}

sub()
  .then()
  .catch((e) => {
    console.error(e);
  });
