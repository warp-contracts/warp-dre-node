// nobody wants to wait in line...
const { postEvalQueue, updateQueue } = require('../bullQueue');

(async () => {
  const postEvalCount = await postEvalQueue.getJobCountByTypes();
  console.log(`postEval queue count  ${postEvalCount}`);
  if (postEvalCount > 5_000) {
    console.log(`postEval queue - obliterate`);
    await postEvalQueue.obliterate();
  } else if (postEvalCount > 1_000) {
    console.log(`postEval queue - drain`);
    await postEvalQueue.drain();
  }

  // const updateCount = await updateQueue.getJobCountByTypes();
  // console.log(`update queue count  ${updateCount}`);
  // if (updateCount > 5_000) {
  //   console.log(`update queue - obliterate`);
  //   await updateQueue.obliterate();
  // } else if (updateCount > 1_000) {
  //   console.log(`update queue - drain`);
  //   await updateQueue.drain();
  // }
})().then(() => {
  console.log(`Finished..`);
  console.log(`Yeah, you wish. Something definitely went wrong. You just don't know yet.`);
  process.exit();
});
