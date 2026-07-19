// Scenario 14: a minimal merchant checkout backend.
// Demonstrates the SDK building blocks + an in-memory order store. In production
// use a real database, a unique address per order, and signed webhooks.
import {
  KingPepeClient,
  createPaymentRequest,
  paymentUri,
  checkPayment,
  parseKpepe,
  toPaymentEvent,
  type PaymentRequest,
  type PaymentStatus,
} from "@kingpepe/sdk";

interface Order {
  request: PaymentRequest;
  status: PaymentStatus;
  fulfilled: boolean;
}

const orders = new Map<string, Order>(); // orderId -> Order (use a DB in production)

export async function createCheckout(wallet: KingPepeClient, orderId: string, priceKpepe: string) {
  const request = createPaymentRequest({
    id: orderId,
    address: await wallet.getNewAddress(orderId), // unique address per order
    amountBaseUnits: parseKpepe(priceKpepe),
    requiredConfirmations: 2,
    ttlMs: 20 * 60 * 1000,
  });
  orders.set(orderId, { request, status: "pending", fulfilled: false });
  return { orderId, uri: paymentUri(request), address: request.address };
}

// Call this on a timer / from a block notification. Idempotent: fulfils once.
export async function pollOrder(wallet: KingPepeClient, orderId: string, emit: (e: unknown) => void) {
  const order = orders.get(orderId);
  if (!order || order.fulfilled) return;
  const state = await checkPayment(wallet, order.request);
  if (state.status !== order.status) {
    order.status = state.status;
    emit(toPaymentEvent(state)); // send a signed webhook in production
  }
  if (state.status === "paid" && !order.fulfilled) {
    order.fulfilled = true; // deliver the product exactly once
    console.log(`Order ${orderId} PAID — fulfilling.`);
  }
}

async function demo() {
  const wallet = KingPepeClient.fromEnv().withWallet("example-shop");
  const checkout = await createCheckout(wallet, `order-${Date.now()}`, "3.00");
  console.log("Checkout:", checkout);
  await pollOrder(wallet, checkout.orderId, (e) => console.log("webhook:", JSON.stringify(e)));
}

if (process.argv[1] && process.argv[1].endsWith("05_merchant_checkout.ts")) {
  demo().catch((err) => {
    console.error("error:", err.message);
    process.exit(1);
  });
}
