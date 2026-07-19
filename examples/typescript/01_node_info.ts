// Scenarios 1-3: connect to a local node; show blockchain and network info.
// Run: npx tsx examples/typescript/01_node_info.ts  (with KINGPEPE_RPC_* env vars)
import { KingPepeClient } from "@kingpepe/sdk";

async function main() {
  const client = KingPepeClient.fromEnv();

  if (!(await client.healthCheck())) {
    throw new Error("KingPepe node is not reachable — check KINGPEPE_RPC_* env vars.");
  }

  const chain = await client.getBlockchainInfo();
  console.log("Blockchain:");
  console.log(`  chain=${chain.chain} height=${chain.blocks} headers=${chain.headers}`);
  console.log(`  bestblockhash=${chain.bestblockhash}`);
  console.log(`  ibd=${chain.initialblockdownload} pruned=${chain.pruned}`);

  const net = await client.getNetworkInfo();
  console.log("Network:");
  console.log(`  subversion=${net.subversion} protocol=${net.protocolversion}`);
  console.log(`  connections=${net.connections} active=${net.networkactive}`);
}

main().catch((err) => {
  console.error("error:", err.message);
  process.exit(1);
});
