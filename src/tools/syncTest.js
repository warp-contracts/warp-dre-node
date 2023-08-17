const loadInteractions = require("../loadInteractions");
const { TagsParser } = require("warp-contracts");
const stringify = require("safe-stable-stringify");
const crypto = require("crypto");

async function main() {
  const tagsParser = new TagsParser();

  const srcIds =  [
    // https://docs.google.com/spreadsheets/d/1F9T1Vyk3geEsrU8wVSdsPj9drO48Ae9f2UpkuE0ralI/edit#gid=0
    "Of9pi--Gj7hCTawhgxOwbuWnFI1h24TTgO5pw8ENJNQ", // Atomic Asset
    "kP1Ed8AMvaaBrEFjatP4pSmiE_fsRrGS0EcBMQYYiyc", // STAMP
    "mGxosQexdvrvzYCshzBvj18Xh1QmZX16qFJBuh4qobo", // U
    "7qv5x9A0NgAlTdMnBc1H2HFvN-te0kzzuT9RNt_66g8", // UCM contract - TBD,
    "eIAyBgHH-H7Qzw9fj7Austj30QKPQn27eaakvpOUSR8", // Facts
    "Of9pi--Gj7hCTawhgxOwbuWnFI1h24TTgO5pw8ENJNQ", // Pages
    "_z0ch80z_daDUFqC9jHjfOL8nekJcok4ZRkE_UesYsk"  // VouchDAO
  ]

  const result = await loadInteractions(1692111085730, 1692111087730, srcIds);

  console.dir(result, {depth: null});

  /*console.log(result.interactions.map(i => {
    return {
    "contractTxId": i.contractTxId, "interactionId": i.interaction.id,
      sortKey: i.sortKey
  }}));
*/

  const interactions = result.interactions;
  console.log("hash", hashElement(interactions));

  const resultLength = interactions.length;
  const firstSortKey = resultLength ? interactions[0].sortKey : null;
  const lastSortKey = resultLength ? interactions[resultLength - 1].sortKey : null;
  console.log("Loaded interactions info", {
    resultLength,
    firstSortKey,
    lastSortKey
  });

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


