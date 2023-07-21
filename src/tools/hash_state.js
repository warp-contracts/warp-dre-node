const stringify = require("safe-stable-stringify");
const crypto = require("crypto");
const fs = require("fs");

function hashState() {
  const fileName = "u_1689946207592.json";
  const evalResult = JSON.parse(fs.readFileSync(fileName, "utf-8"));

  const state = evalResult.cachedValue.state;
  const validity = evalResult.cachedValue.validity;

  console.log('State hash', hashElement(state));
  console.log('Validity count', Object.keys(validity).length);
  console.log('Validity hash', hashElement(validity));

  fs.writeFileSync(`state_${fileName}`, JSON.stringify(state, null, 2));
}

hashState();


function hashElement(elementToHash) {
  const stringified = typeof elementToHash != 'string' ? stringify(elementToHash) : elementToHash;
  const hash = crypto.createHash('sha256');
  hash.update(stringified);
  return hash.digest('hex');
}