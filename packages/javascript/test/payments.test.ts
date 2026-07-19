import { describe, it, expect } from "vitest";
import {
  createPaymentRequest,
  evaluatePayment,
  paymentUri,
  toPaymentEvent,
  ValidationError,
  type PaymentObservation,
  type PaymentRequest,
} from "../src/index.js";

const ADDR = "rkpepe1qqypqxpq9qcrsszg2pvxq6rs0zqg3yyc5dtjg0t";
const T0 = 1_000_000;

function req(overrides: Partial<PaymentRequest> = {}): PaymentRequest {
  return {
    id: "pay_1",
    address: ADDR,
    amountBaseUnits: 100_000_000n,
    requiredConfirmations: 2,
    expiresAt: T0 + 60_000,
    ...overrides,
  };
}

function obs(o: Partial<PaymentObservation> = {}): PaymentObservation {
  return { receivedBaseUnits: 0n, confirmedBaseUnits: 0n, confirmations: 0, seen: false, ...o };
}

describe("createPaymentRequest", () => {
  it("validates inputs", () => {
    expect(() => createPaymentRequest({ id: "", address: ADDR, amountBaseUnits: 1n })).toThrow(ValidationError);
    expect(() => createPaymentRequest({ id: "x", address: ADDR, amountBaseUnits: 0n })).toThrow(ValidationError);
    expect(() =>
      createPaymentRequest({ id: "x", address: "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4", amountBaseUnits: 1n }),
    ).toThrow(ValidationError);
  });

  it("sets expiry from ttl and builds a URI", () => {
    const r = createPaymentRequest({ id: "x", address: ADDR, amountBaseUnits: 150_000_000n, ttlMs: 1000, now: T0 });
    expect(r.expiresAt).toBe(T0 + 1000);
    expect(paymentUri(r)).toContain("amount=1.5");
  });
});

describe("evaluatePayment state machine", () => {
  it("pending when nothing seen", () => {
    expect(evaluatePayment(req(), obs(), T0).status).toBe("pending");
  });

  it("detected when seen with 0 confirmations", () => {
    const s = evaluatePayment(req(), obs({ seen: true, receivedBaseUnits: 100_000_000n, confirmations: 0 }), T0);
    expect(s.status).toBe("detected");
    expect(s.terminal).toBe(false);
  });

  it("confirming when some but not enough confirmations", () => {
    const s = evaluatePayment(req(), obs({ seen: true, receivedBaseUnits: 100_000_000n, confirmations: 1 }), T0);
    expect(s.status).toBe("confirming");
  });

  it("paid when confirmed amount meets the expected amount", () => {
    const s = evaluatePayment(
      req(),
      obs({ seen: true, receivedBaseUnits: 100_000_000n, confirmedBaseUnits: 100_000_000n, confirmations: 2 }),
      T0,
    );
    expect(s.status).toBe("paid");
    expect(s.terminal).toBe(true);
  });

  it("overpaid when confirmed amount exceeds expected", () => {
    const s = evaluatePayment(
      req(),
      obs({ seen: true, receivedBaseUnits: 120_000_000n, confirmedBaseUnits: 120_000_000n, confirmations: 3 }),
      T0,
    );
    expect(s.status).toBe("overpaid");
  });

  it("underpaid when enough confirmations but too little value", () => {
    const s = evaluatePayment(
      req(),
      obs({ seen: true, receivedBaseUnits: 40_000_000n, confirmedBaseUnits: 40_000_000n, confirmations: 2 }),
      T0,
    );
    expect(s.status).toBe("underpaid");
  });

  it("expired when past expiry with nothing confirmed", () => {
    const s = evaluatePayment(req(), obs(), T0 + 120_000);
    expect(s.status).toBe("expired");
    expect(s.terminal).toBe(true);
  });

  it("underpaid (not expired) when expiry passes with partial confirmed funds", () => {
    const s = evaluatePayment(
      req(),
      obs({ seen: true, receivedBaseUnits: 40_000_000n, confirmedBaseUnits: 40_000_000n, confirmations: 5 }),
      T0 + 120_000,
    );
    expect(s.status).toBe("underpaid");
  });

  it("confirmation beats expiry: paid even slightly after expiry", () => {
    const s = evaluatePayment(
      req(),
      obs({ seen: true, receivedBaseUnits: 100_000_000n, confirmedBaseUnits: 100_000_000n, confirmations: 2 }),
      T0 + 120_000,
    );
    expect(s.status).toBe("paid");
  });
});

describe("payment events / idempotency", () => {
  it("event carries the id (idempotency key) and serializable amounts", () => {
    const s = evaluatePayment(req(), obs({ seen: true, receivedBaseUnits: 100_000_000n }), T0);
    const ev = toPaymentEvent(s, T0);
    expect(ev.paymentId).toBe("pay_1");
    expect(ev.expectedBaseUnits).toBe("100000000");
    expect(ev.receivedBaseUnits).toBe("100000000");
    expect(JSON.parse(JSON.stringify(ev)).at).toBe(T0);
  });

  it("is deterministic: same inputs -> same status (safe to re-run)", () => {
    const observation = obs({ seen: true, receivedBaseUnits: 100_000_000n, confirmedBaseUnits: 100_000_000n, confirmations: 2 });
    const a = evaluatePayment(req(), observation, T0);
    const b = evaluatePayment(req(), observation, T0);
    expect(a.status).toBe(b.status);
  });
});
