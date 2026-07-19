// Scenarios 8-11: build a kingpepe: URI, monitor an address, wait for
// confirmations, and send a payment safely. Use regtest for development.
import {
  KingPepeClient,
  createPaymentRequest,
  paymentUri,
  checkPayment,
  parseKpepe,
  type PaymentState,
} from "@kingpepe/sdk";

async function main() {
  const client = KingPepeClient.fromEnv();
  const wallet = client.withWallet("example-shop");

  // 8) Create a payment request and its kingpepe: URI.
  const req = createPaymentRequest({
    id: `order-${Date.now()}`,
    address: await wallet.getNewAddress("checkout"),
    amountBaseUnits: parseKpepe("1.25"),
    requiredConfirmations: 1,
    ttlMs: 30 * 60 * 1000,
  });
  console.log("Pay to:", paymentUri(req));

  // 11) (demo) pay it ourselves so the example is self-contained on regtest.
  //     In production the buyer pays; you would NOT send from your own wallet.
  if (client.network === "regtest") {
    const txid = await wallet.sendToAddress(req.address, req.amountBaseUnits);
    console.log("Sent demo payment:", txid);
    await wallet.generateToAddress(1, await wallet.getNewAddress()); // confirm it
  }

  // 9-10) Poll status until a terminal state (or a few iterations).
  let state: PaymentState | undefined;
  for (let i = 0; i < 10; i++) {
    state = await checkPayment(wallet, req);
    console.log(`status=${state.status} confirmations=${state.observation.confirmations}`);
    if (state.terminal) break;
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.log("Final status:", state?.status);
}

main().catch((err) => {
  console.error("error:", err.message);
  process.exit(1);
});
