module.exports = async () => {
  const response = await fetch("https://gw.warp.cc/gateway/gcp/alive");
  const result = await response.json();
  return result.db.l1_last_interaction_height - 1;
};
