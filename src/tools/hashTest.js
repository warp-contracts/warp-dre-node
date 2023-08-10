const crypto = require("crypto");
const stringify = require('safe-stable-stringify');

async function main() {
  const response = await fetch("http://35.246.161.86:8080/contract?id=KTzTXT_ANmF84fWEKHzWURD1LWd9QaFR9yfYUwH2Lxw&state=true&validity=true&errorMessages=true");
  const result = await response.json();

  console.time("stringify all");
  const allS = stringify({
    state: result.state,
    validity: result.validity,
    errorMessages: result.errorMessages
  });
  console.timeLog("stringify all");

  console.time("stringify state");
  const stringState = JSON.stringify(result.state);
  console.timeLog("stringify state");

  console.time("stringify validity");
  const stringValidity = stringify(result.validity);
  console.timeLog("stringify validity");

  console.log(generateHash(stringState));
  console.log(generateHash(stringValidity));
}

function generateHash(value) {
  console.time('hash');
  const hash = crypto.createHash("SHA256");

  hash.update(value);
  const result = hash.digest("hex");
  console.timeLog('hash')

  return result;
}


main().finally();