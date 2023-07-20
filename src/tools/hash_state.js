const stringify = require("safe-stable-stringify");
const crypto = require("crypto");
const fs = require("fs");

function hashState() {
  const evalResult = JSON.parse(fs.readFileSync("u_1689851780539.json", "utf-8"));

  const state = evalResult.cachedValue.state;
  const validity = evalResult.cachedValue.state;

  console.log('State hash', hashElement(state));
  console.log("Validity count", Object.keys(evalResult.cachedValue.validity).length);
}

hashState();


function hashElement(elementToHash) {
  const stringified = typeof elementToHash != 'string' ? stringify(elementToHash) : elementToHash;
  const hash = crypto.createHash('sha256');
  hash.update(stringified);
  return hash.digest('hex');
}