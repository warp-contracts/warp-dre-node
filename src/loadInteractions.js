module.exports = async (startTimestamp, endTimestamp, whiteListedSources) => {
  return await postData({
    start: startTimestamp,
    end: endTimestamp,
    limit: 10000,
    src_ids: whiteListedSources
  });
};


async function postData(data = {}) {
  const response = await fetch('http://35.246.150.123/v1/interactions', {
    method: "POST",
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return response.json();

}