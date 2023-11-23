const loadInteractions = require("../loadInteractions");
const { TagsParser } = require("warp-contracts");
const stringify = require("safe-stable-stringify");
const crypto = require("crypto");

async function main() {
  const tagsParser = new TagsParser();

  const srcIds =  [
    "Of9pi--Gj7hCTawhgxOwbuWnFI1h24TTgO5pw8ENJNQ",
    "W78KEzU8vIODFHzwa9ab7SS7Pjchc7KenivCiwSHxBY",
    "kP1Ed8AMvaaBrEFjatP4pSmiE_fsRrGS0EcBMQYYiyc",
    "mGxosQexdvrvzYCshzBvj18Xh1QmZX16qFJBuh4qobo",
    "7qv5x9A0NgAlTdMnBc1H2HFvN-te0kzzuT9RNt_66g8",
    "eIAyBgHH-H7Qzw9fj7Austj30QKPQn27eaakvpOUSR8",
    "Of9pi--Gj7hCTawhgxOwbuWnFI1h24TTgO5pw8ENJNQ",
    "ovWCp0xKuHtq-bADXbtiNr6umwb_AE73kVZWtfHlX3w",
    "1hDZBRSptTNgnACuO9qGHLbaOfnAcMBKCHcHPRhMWUY",
    "LBcYEl2zwKDApj1Cow1_BYyiicxVV7OCZTexsjk6mB4",
    "dRTFmLwJ3cNqdNvFK4yUvwc13CrJtFOmLymLxL4HWOE",
    "yXPm9-9VyxH9otGf7xim0EJsnt21IJN8qJjanFTC_kc",
    "qOd7mNAJdju9PxtsRJbel4Zu3xYgEwUbxW8U14czjD8",
    "0GOnb0o9c232d6SXF_HXHbGzfIdiYeos7U5jobOSZ_c",
    "8kPgNMm7dZUVk93T7wq05otEy1oDNqZhyD3L7WrcMTY",
    "yDAppVePqGU1qcRnxdk-AShpIJ0RHCZixOMXtJTgm4Y",
    "W7V0n7g2UKhCee1QDTpvAq6eI6pP9jCS860uF70TbYY",
    "h9v17KHV4SXwdW2-JHU6a23f6R0YtbXZJJht8LfP8QM"
  ]

  //const result = await loadInteractions(1692111085730, 1692111087730, srcIds);

  console.time("fetch");
  //const result = await loadInteractions(1666220657408, 1666220657408 + 150 * 24 * 3600 * 1000, srcIds);
  /*const result = await loadInteractions(
    1666220657408 + 150 * 24 * 3600 * 1000,
    1666220657408 + 200 * 24 * 3600 * 1000,
    srcIds);*/

  const now = Date.now();

  const result = await loadInteractions(1698963439408, 1698963441408, srcIds);
  console.dir(result, { depth: null})

  console.timeLog("fetch");

  //console.dir(result, {depth: null});
  console.log("result length", result.interactions.length);

  console.time("mapping entries");
  const contractInteractions = result.interactions.map(e => e.interaction);
  console.timeLog("mapping entries");

  console.time("stringify");
  const stringifiedInteractions = stringify(contractInteractions);
  console.timeLog("stringify");

  console.time("hash");
  const hash = hashElement(result.interactions);
  console.log(hash);
  console.timeLog("hash");

  // 1692213749730 1692213751730
  // 1692221847730 1692221849730
}

main().finally();

function hashElement(elementToHash) {
  const stringified = typeof elementToHash != 'string' ? stringify(elementToHash) : elementToHash;
  const hash = crypto.createHash('sha256');
  hash.update(stringified);
  return hash.digest('hex');
}


