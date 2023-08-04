module.exports = async (startTimestamp, endTimestamp, whiteListedSources) => {
  const response = await postData({
    start: startTimestamp,
    end: endTimestamp,
    limit: 10000,
    src_ids: whiteListedSources
  });

  console.log(response);
  if (response) {
    if (response.status == 204) {
      throw new Error("Blocks not yet ready for this timestamp, wait!");
    } else if (response.ok) {
      return await response.json();
    } else {
      const text = await response.text();
      throw new Error(`Wrong response code: ${response.status}. ${text}`);
    }
  } else {
    throw new Error("Response null or undefined");
  }
};


async function postData(data = {}) {
  return await fetch('http://35.246.150.123/v1/interactions', {
    method: "POST",
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}