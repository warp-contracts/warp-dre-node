module.exports = async (startTimestamp, endTimestamp, whiteListedSources) => {
  const response = await postData({
    start: startTimestamp,
    end: endTimestamp,
    limit: 10000,
    src_ids: whiteListedSources
  });

  console.log(response);
  if (response && response.ok) {
    return await response.json();
  } else {
    const text = await response.text();
    throw new Error(`Wrong response code: ${response.status}. ${text}`);
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