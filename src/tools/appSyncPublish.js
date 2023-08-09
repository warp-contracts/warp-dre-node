const { publish: appSyncPublish, initPubSub: initAppSyncPublish } = require('warp-contracts-pubsub');

initAppSyncPublish();

const { CompressionStream } = require("node:stream/web");
const { bufferTob64, bufferTob64Url } = require("arweave/node/lib/utils");
const { bufferToString } = require("arweave/node/lib/utils");

async function publish() {


  const byteArrayToPublish = new TextEncoder('utf-8').encode(JSON.stringify({ dupa: "blada" }));
  const cs = new CompressionStream('gzip');
  const writer = cs.writable.getWriter();
  await writer.write(byteArrayToPublish);
  await writer.close();

  const baToPublish = await new Response(cs.readable).arrayBuffer();
  //const toPublish = bufferTob64Url(baToPublish);
  // console.log(toPublish);

  const contractTxId = "xyz";
  const config = {
    dreName: 'LOCAL-TEST',
  }


  const response = await fetch("http://35.246.161.86:8080/contract?id=KTzTXT_ANmF84fWEKHzWURD1LWd9QaFR9yfYUwH2Lxw&state=true");
  const result = await response.json();

  const toPublish = JSON.stringify(result.state);
  const size = Buffer.byteLength(toPublish);

  console.log("State size in bytes", size);



  try {
    await appSyncPublish(
      `states/${config.dreName}/${contractTxId}`,
      toPublish,
      "da2-xb3gor3tjnc4dd5tqtz52hc7ja"
    );
  } catch (e) {
    console.error(e);
  }
}

publish().finally();