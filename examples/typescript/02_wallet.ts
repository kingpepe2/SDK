// Scenarios 4-7: create/load a descriptor wallet, generate an address,
// check balance, and list unspent outputs. Regtest recommended.
import { KingPepeClient, formatKpepe, rpcAmountToBaseUnits } from "@kingpepe/sdk";

const WALLET = "example-shop";

async function main() {
  const client = KingPepeClient.fromEnv();

  // Create the wallet if it doesn't exist, otherwise load it.
  const wallets = await client.listWallets();
  if (!wallets.includes(WALLET)) {
    try {
      await client.createWallet(WALLET, { descriptors: true });
    } catch {
      await client.loadWallet(WALLET);
    }
  }
  const wallet = client.withWallet(WALLET);

  const address = await wallet.getNewAddress("example-label");
  console.log("New receiving address:", address);

  const balances = await wallet.getBalances();
  const trusted = rpcAmountToBaseUnits(balances.mine.trusted);
  console.log("Trusted balance:", formatKpepe(trusted), "KPEPE");

  const unspent = await wallet.listUnspent(0);
  console.log(`Unspent outputs: ${unspent.length}`);
  for (const u of unspent.slice(0, 5)) {
    console.log(`  ${u.txid}:${u.vout}  ${formatKpepe(rpcAmountToBaseUnits(u.amount))} KPEPE  conf=${u.confirmations}`);
  }
}

main().catch((err) => {
  console.error("error:", err.message);
  process.exit(1);
});
