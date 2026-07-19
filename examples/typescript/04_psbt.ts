// Scenario 12: create and process a PSBT (Partially Signed Bitcoin Transaction —
// the standard cross-wallet format) with a funded wallet.
import { KingPepeClient, parseKpepe, formatKpepe } from "@kingpepe/sdk";

async function main() {
  const client = KingPepeClient.fromEnv();
  const wallet = client.withWallet("example-shop");

  const destination = await wallet.getNewAddress("psbt-dest");
  const amount = parseKpepe("0.5");

  // Fund a PSBT that pays `amount` to `destination` (wallet selects inputs + change).
  const funded = (await wallet.walletCreateFundedPsbt(
    [],
    [{ [destination]: formatKpepe(amount) }],
    0,
    { fee_rate: 2 },
  )) as { psbt: string; fee: number };
  console.log("Funded PSBT fee:", funded.fee);

  const analysis = await wallet.analyzePsbt(funded.psbt);
  console.log("Analysis next:", (analysis as { next?: string }).next);

  // Sign with the wallet, then finalize to a broadcastable transaction.
  const processed = (await wallet.walletProcessPsbt(funded.psbt)) as { psbt: string; complete: boolean };
  const final = (await wallet.finalizePsbt(processed.psbt)) as { hex?: string; complete: boolean };
  console.log("Finalized complete:", final.complete);

  // To broadcast: if (final.hex) await wallet.sendRawTransaction(final.hex);
  // Left commented so the example does not move funds unless you opt in.
}

main().catch((err) => {
  console.error("error:", err.message);
  process.exit(1);
});
