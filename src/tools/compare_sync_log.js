
async function main() {

  // the 'startTimestamp' when first restart occurred
  const startTimestamp = 1692213749730;
  const iterations = (8 * 3600 * 1000) / 2;
  const window = 2000;

  let currentStartBack = startTimestamp;
  let currentStartFwd = startTimestamp;
  for (let i = 0; i < iterations; i++) {
    currentStartBack = currentStartBack - window;
    await compare(currentStartBack, currentStartBack + window);

    currentStartFwd = currentStartFwd + window;
    await compare(currentStartFwd, currentStartFwd + window);
  }


  async function compare(start, end) {
    console.log(`Checking for ${start} (${new Date(start)}), ${end} (${new Date(end)})`);
    const response1 = await fetch(`http://35.246.161.86:8080/sync-log?start=${start}&end=${end}`);
    if (!response1.ok) {
      throw new Error(`Wrong response for ${start} , ${end} from 35.246.161.86`);
    }
    const result1 = await response1.json();
    const response2 = await fetch(`http://34.159.74.111:8080/sync-log?start=${start}&end=${end}`);
    if (!response2.ok) {
      throw new Error(`Wrong response for ${start} , ${end} from 34.159.74.111`);
    }
    const result2 = await response2.json();

    /*console.log({
      "one": result1.response_hash,
      "two": result2.response_hash
    });*/

    if (!result1.response_hash || !result2.response_hash) {
      throw new Error(`No response hash for ${start} , ${end}`);
    }

    if (result1.response_hash != result2.response_hash) {
      throw new Error(`Different hashes for ${start} , ${end}`);
    }
  }
}

main().then();