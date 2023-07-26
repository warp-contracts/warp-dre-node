async function main() {
  const response = await fetch("https://gw.warp.cc/gateway/gcp/alive");
  const result = await response.json();
  console.log(result);
  console.log(result.db.l1_last_interaction_height);
  return result.db.l1_last_interaction_height;
}

main().finally();