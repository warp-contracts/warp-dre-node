
async function main() {


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


  // const response = await fetch("http://35.246.161.86:8080/contract?id=KTzTXT_ANmF84fWEKHzWURD1LWd9QaFR9yfYUwH2Lxw&validity=true&state=false");
  const response = await fetch("http://35.246.161.86:8080/contract?id=tfalT8Z-88riNtoXdF5ldaBtmsfcSmbMqWLh2DHJIbg&validity=true&state=false");
  const result = await response.json();

  const validity = result.validity;

  console.log('KDoXaqaNgy4eeXYQsU2FW_4M4UpyjEmRGtiT_iRF2Hk', validity['KDoXaqaNgy4eeXYQsU2FW_4M4UpyjEmRGtiT_iRF2Hk']);



}

main().finally();