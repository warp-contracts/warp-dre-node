const loadInteractions = require("../loadInteractions");
const { TagsParser } = require("warp-contracts");

async function main() {
  const tagsParser = new TagsParser();

  const srcIds =  [
    // https://docs.google.com/spreadsheets/d/1F9T1Vyk3geEsrU8wVSdsPj9drO48Ae9f2UpkuE0ralI/edit#gid=0
    "Of9pi--Gj7hCTawhgxOwbuWnFI1h24TTgO5pw8ENJNQ", // Atomic Asset
    "kP1Ed8AMvaaBrEFjatP4pSmiE_fsRrGS0EcBMQYYiyc", // STAMP
    "7qv5x9A0NgAlTdMnBc1H2HFvN-te0kzzuT9RNt_66g8", // UCM contract - TBD,
    "eIAyBgHH-H7Qzw9fj7Austj30QKPQn27eaakvpOUSR8", // Facts
    "Of9pi--Gj7hCTawhgxOwbuWnFI1h24TTgO5pw8ENJNQ", // Pages
    "_z0ch80z_daDUFqC9jHjfOL8nekJcok4ZRkE_UesYsk"  // VouchDAO
  ]

  const result = await loadInteractions(0, 1691083016820, srcIds);


  const interactions = result.interactions;
  const resultLength = interactions.length;
  const firstSortKey = resultLength ? interactions[0].sortKey : null;
  const lastSortKey = resultLength ? interactions[resultLength - 1].sortKey : null;
  console.log("Loaded interactions info", {
    resultLength,
    firstSortKey,
    lastSortKey
  });

  const gaContractInteractions = interactions.filter(
    i => i.contractTxId == "Ga56fegoNWB1lt_501_tzw4Z_iQBrotLopo7eMAdn6Q"
    || tagsParser.isInteractWrite(i.interaction, "Ga56fegoNWB1lt_501_tzw4Z_iQBrotLopo7eMAdn6Q"));
  console.log(gaContractInteractions);
  console.log('Length', gaContractInteractions.length);
}

main().finally();