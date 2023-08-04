const { WarpFactory, defaultCacheOptions, Tag } = require('warp-contracts');
const fs = require('fs');
const { ArweaveSigner, DeployPlugin } = require('warp-contracts-plugin-deploy');

async function main() {
  const warp = WarpFactory.forMainnet({ ...defaultCacheOptions, inMemory: true }).use(new DeployPlugin());
  const wallet = JSON.parse(fs.readFileSync('.secrets/warp.json', 'utf-8'));
  // deploy asset
  const assetInitialState = fs.readFileSync('tools/bazar-asset-state.json', 'utf-8');
  const ucmInitialState = fs.readFileSync('tools/bazar-ucm-state.json', 'utf-8');

  const uContractTxId = 'KTzTXT_ANmF84fWEKHzWURD1LWd9QaFR9yfYUwH2Lxw';

  const { contractTxId: ucmContractTxId } = await warp.deployFromSourceTx({
    srcTxId: '7qv5x9A0NgAlTdMnBc1H2HFvN-te0kzzuT9RNt_66g8',
    initState: ucmInitialState,
    wallet: new ArweaveSigner(wallet),
    evaluationManifest: {
      evaluationOptions: {
        sourceType: 'redstone-sequencer',
        internalWrites: true,
        unsafeClient: 'skip',
        allowBigInt: true
      }
    },
    tags: [new Tag('type', 'Warp-Testing')]
  });
  console.log('Ucm contract tx id', ucmContractTxId);
  await fetch(`https://dre-5.warp.cc/sync?id=${ucmContractTxId}&test=false`)
    .then((res) => {
      return res.text();
    })
    .catch((e) => console.log(e));
  await fetch(`https://dre-6.warp.cc/sync?id=${ucmContractTxId}&test=false`)
    .then((res) => {
      res.text();
    })
    .catch((e) => console.log(e));

  setTimeout(async () => {
    const { contractTxId: assetContractTxId } = await warp.deployFromSourceTx({
      srcTxId: 'Of9pi--Gj7hCTawhgxOwbuWnFI1h24TTgO5pw8ENJNQ',
      initState: assetInitialState,
      wallet: new ArweaveSigner(wallet),
      tags: [
        new Tag('Title', 'Warp Test'),
        new Tag('Description', 'Warp Heavy Testing.'),
        new Tag('Type', 'text'),
        new Tag('Collection-Code', 'warp-collection'),
        new Tag('Indexed-By', 'ucm'),
        new Tag('License', 'UDLicense'),
        new Tag('Access', 'public'),
        new Tag('Derivation', 'allowed-with-license-fee'),
        new Tag('Commercial', 'allowed'),
        new Tag('License-Fee', 'One-Time-0.1'),
        new Tag('Payment-Mode', 'Global-Distribution'),
        new Tag('topic:warp', 'warp')
      ],
      data: {
        'Content-Type': 'text/html',
        body: 'Hejcia'
      },
      evaluationManifest: {
        evaluationOptions: {
          sourceType: 'redstone-sequencer',
          allowBigInt: true,
          internalWrites: true,
          unsafeClient: 'skip',
          useConstructor: true
        }
      }
    });
    console.log('Asset contract tx id', assetContractTxId);

    const { contractTxId: assetContractTxId2 } = await warp.deployFromSourceTx({
      srcTxId: 'Of9pi--Gj7hCTawhgxOwbuWnFI1h24TTgO5pw8ENJNQ',
      initState: assetInitialState,
      wallet: new ArweaveSigner(wallet),
      tags: [
        new Tag('Title', 'Warp Test'),
        new Tag('Description', 'Warp Heavy Testing.'),
        new Tag('Type', 'text'),
        new Tag('Collection-Code', 'warp-collection'),
        new Tag('Indexed-By', 'ucm'),
        new Tag('License', 'UDLicense'),
        new Tag('Access', 'public'),
        new Tag('Derivation', 'allowed-with-license-fee'),
        new Tag('Commercial', 'allowed'),
        new Tag('License-Fee', 'One-Time-0.1'),
        new Tag('Payment-Mode', 'Global-Distribution'),
        new Tag('topic:warp', 'warp')
      ],
      data: {
        'Content-Type': 'text/html',
        body: 'Hejcia'
      },
      evaluationManifest: {
        evaluationOptions: {
          sourceType: 'redstone-sequencer',
          allowBigInt: true,
          internalWrites: true,
          unsafeClient: 'skip',
          useConstructor: true
        }
      }
    });
    console.log('Asset contract tx id', assetContractTxId2);

    const ucmContractTxId = 'uLUQgrTJSkYVBiTaynyGLvFGdonNKoTlYtYRSVOyYZM';
    const assetContract = warp.contract(assetContractTxId).connect(wallet).setEvaluationOptions({
      remoteStateSyncEnabled: true,
      remoteStateSyncSource: 'https://dre-5.warp.cc/contract',
      internalWrites: true,
      unsafeClient: 'skip',
      allowBigInt: true
    });
    const assetContract2 = warp.contract(assetContractTxId2).connect(wallet).setEvaluationOptions({
      remoteStateSyncEnabled: true,
      remoteStateSyncSource: 'https://dre-5.warp.cc/contract',
      internalWrites: true,
      unsafeClient: 'skip',
      allowBigInt: true
    });
    const ucmContract = warp.contract(ucmContractTxId).connect(wallet).setEvaluationOptions({
      remoteStateSyncEnabled: true,
      remoteStateSyncSource: 'https://dre-5.warp.cc/contract',
      internalWrites: true,
      unsafeClient: 'skip',
      allowBigInt: true
    });
    const uContract = warp.contract(uContractTxId).connect(wallet).setEvaluationOptions({
      remoteStateSyncEnabled: true,
      remoteStateSyncSource: 'https://dre-5.warp.cc/contract',
      internalWrites: true,
      unsafeClient: 'skip',
      allowBigInt: true
    });

    // list asset for sale
    await ucmContract.writeInteraction({
      function: 'addPair',
      pair: [assetContractTxId, uContractTxId]
    });

    const assetAllowResult = await assetContract.writeInteraction(
      {
        function: 'allow',
        target: ucmContractTxId,
        qty: 100
      },
      { tags: new Tag('Indexed-By', 'ucm') }
    );

    const ucmCreateOrderSellResult = await ucmContract.writeInteraction({
      function: 'createOrder',
      pair: [assetContractTxId, uContractTxId],
      transaction: assetAllowResult.originalTxId,
      qty: 100,
      price: 20000
    });

    await ucmContract.writeInteraction({
      function: 'cancelOrder',
      orderID: ucmCreateOrderSellResult.originalTxId
    });

    const assetAllowResult2 = await assetContract.writeInteraction({
      function: 'allow',
      target: ucmContractTxId,
      qty: 100
    });

    await ucmContract.writeInteraction({
      function: 'createOrder',
      pair: [assetContractTxId, uContractTxId],
      transaction: assetAllowResult2.originalTxId,
      qty: 100,
      price: 20000
    });

    // buy asset
    const uAllowResult = await uContract.writeInteraction({
      function: 'allow',
      qty: 20000,
      target: ucmContractTxId
    });

    await ucmContract.writeInteraction({
      function: 'createOrder',
      pair: [uContractTxId, assetContractTxId],
      transaction: uAllowResult.originalTxId,
      qty: 20000
    });

    await ucmContract.writeInteraction({
      function: 'addPair',
      pair: [assetContractTxId2, uContractTxId]
    });

    const asset2AllowResult = await assetContract2.writeInteraction(
      {
        function: 'allow',
        target: ucmContractTxId,
        qty: 100
      },
      { tags: new Tag('Indexed-By', 'ucm') }
    );

    await ucmContract.writeInteraction({
      function: 'createOrder',
      pair: [assetContractTxId2, uContractTxId],
      transaction: asset2AllowResult.originalTxId,
      qty: 100,
      price: 20000
    });

    // buy asset
    const uAllowResult2 = await uContract.writeInteraction({
      function: 'allow',
      qty: 20000,
      target: ucmContractTxId
    });

    await ucmContract.writeInteraction({
      function: 'createOrder',
      pair: [uContractTxId, assetContractTxId2],
      transaction: uAllowResult2.originalTxId,
      qty: 20000
    });
  }, 5000);
}

main().catch((e) => console.log(e));
