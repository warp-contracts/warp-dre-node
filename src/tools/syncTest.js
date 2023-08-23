const loadInteractions = require("../loadInteractions");
const { TagsParser } = require("warp-contracts");
const stringify = require("safe-stable-stringify");
const crypto = require("crypto");

async function main() {
  const tagsParser = new TagsParser();

  const srcIds =  [
    // https://docs.google.com/spreadsheets/d/1F9T1Vyk3geEsrU8wVSdsPj9drO48Ae9f2UpkuE0ralI/edit#gid=0
    "Of9pi--Gj7hCTawhgxOwbuWnFI1h24TTgO5pw8ENJNQ", // Atomic Asset
    "W78KEzU8vIODFHzwa9ab7SS7Pjchc7KenivCiwSHxBY", // STAMP
    "kP1Ed8AMvaaBrEFjatP4pSmiE_fsRrGS0EcBMQYYiyc", // STAMP-evolve
    "mGxosQexdvrvzYCshzBvj18Xh1QmZX16qFJBuh4qobo", // U
    "7qv5x9A0NgAlTdMnBc1H2HFvN-te0kzzuT9RNt_66g8", // UCM contract old
    "eIAyBgHH-H7Qzw9fj7Austj30QKPQn27eaakvpOUSR8", // Facts
    "Of9pi--Gj7hCTawhgxOwbuWnFI1h24TTgO5pw8ENJNQ", // Pages
    "ovWCp0xKuHtq-bADXbtiNr6umwb_AE73kVZWtfHlX3w", // VouchDAO
    "1hDZBRSptTNgnACuO9qGHLbaOfnAcMBKCHcHPRhMWUY", // VouchDAO-evolve
    "LBcYEl2zwKDApj1Cow1_BYyiicxVV7OCZTexsjk6mB4", // UCM contract new
    "dRTFmLwJ3cNqdNvFK4yUvwc13CrJtFOmLymLxL4HWOE", // UCM contract evolve
    "yXPm9-9VyxH9otGf7xim0EJsnt21IJN8qJjanFTC_kc", // UCM contract evolve
  ]

  //const result = await loadInteractions(1692111085730, 1692111087730, srcIds);

  console.time("fetch");
  //const result = await loadInteractions(1666220657408, 1666220657408 + 150 * 24 * 3600 * 1000, srcIds);
  /*const result = await loadInteractions(
    1666220657408 + 150 * 24 * 3600 * 1000,
    1666220657408 + 200 * 24 * 3600 * 1000,
    srcIds);*/

  const now = Date.now();

  const result = await loadInteractions(now - 4000, now - 2000, srcIds);
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
  const hash = hashElement(stringifiedInteractions);
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


