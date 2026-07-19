// Copyright (c) 2026 The KingPepe developers
// Distributed under the MIT software license, see the accompanying LICENSE file.

import { KingPepeClient } from "./client.js";
import { assertKingPepeAddress } from "./address.js";
import { rpcAmountToBaseUnits } from "./money.js";
import { buildUri } from "./uri.js";
import { ValidationError } from "./errors.js";

/**
 * Merchant payment building blocks. This is NOT a hosted payment processor: it
 * provides reusable, side-effect-light pieces (a pure state evaluator plus an
 * RPC-backed observer) that a merchant backend composes with its own database.
 *
 * Production guidance: assign a UNIQUE address per payment, persist every
 * PaymentRequest and its last PaymentState, treat webhook events as at-least-once
 * (idempotent on `request.id`), and never trust a payment until it reaches the
 * configured confirmation depth.
 */

export type PaymentStatus =
  | "pending"
  | "detected"
  | "confirming"
  | "paid"
  | "underpaid"
  | "overpaid"
  | "expired"
  | "cancelled"
  | "failed";

export interface PaymentRequest {
  /** Merchant-assigned unique id (used as the idempotency key). */
  id: string;
  /** Unique receiving address for this payment. */
  address: string;
  /** Expected amount in integer base units (sat). */
  amountBaseUnits: bigint;
  requiredConfirmations: number;
  /** Absolute expiry as a Unix ms timestamp. */
  expiresAt: number;
  label?: string;
  message?: string;
}

export interface PaymentObservation {
  /** Total amount received to the address in base units (0-conf included). */
  receivedBaseUnits: bigint;
  /** Amount received with at least `requiredConfirmations` confirmations. */
  confirmedBaseUnits: bigint;
  /** Highest confirmation count observed among received outputs (0 if none). */
  confirmations: number;
  /** Whether any output (even 0-conf) has been seen. */
  seen: boolean;
}

export interface PaymentState {
  status: PaymentStatus;
  request: PaymentRequest;
  observation: PaymentObservation;
  /** True once the terminal outcome (paid/overpaid/underpaid/expired/...) is reached. */
  terminal: boolean;
}

/** A webhook-ready, serializable event describing a payment state. */
export interface PaymentEvent {
  type: "payment_status";
  paymentId: string;
  status: PaymentStatus;
  address: string;
  expectedBaseUnits: string;
  receivedBaseUnits: string;
  confirmations: number;
  requiredConfirmations: number;
  /** Unix ms timestamp when the event was produced. */
  at: number;
}

export interface CreatePaymentRequestInput {
  id: string;
  address: string;
  amountBaseUnits: bigint;
  requiredConfirmations?: number;
  /** Time-to-live in ms from `now`. Defaults to 15 minutes. */
  ttlMs?: number;
  label?: string;
  message?: string;
  now?: number;
}

const TERMINAL: ReadonlySet<PaymentStatus> = new Set([
  "paid",
  "overpaid",
  "expired",
  "cancelled",
  "failed",
]);

/** Create a validated PaymentRequest. */
export function createPaymentRequest(input: CreatePaymentRequestInput): PaymentRequest {
  if (!input.id) throw new ValidationError("Payment id is required (idempotency key).");
  assertKingPepeAddress(input.address);
  if (input.amountBaseUnits <= 0n) throw new ValidationError("Payment amount must be positive.");
  const requiredConfirmations = input.requiredConfirmations ?? 1;
  if (requiredConfirmations < 0) throw new ValidationError("requiredConfirmations must be >= 0.");
  const now = input.now ?? Date.now();
  const ttlMs = input.ttlMs ?? 15 * 60 * 1000;
  return {
    id: input.id,
    address: input.address,
    amountBaseUnits: input.amountBaseUnits,
    requiredConfirmations,
    expiresAt: now + ttlMs,
    label: input.label,
    message: input.message,
  };
}

/** Build the `kingpepe:` URI for a payment request. */
export function paymentUri(request: PaymentRequest): string {
  return buildUri({
    address: request.address,
    amountBaseUnits: request.amountBaseUnits,
    label: request.label,
    message: request.message,
  });
}

/**
 * Pure payment-state evaluator: given a request, an observation, and the current
 * time, compute the status. No I/O — deterministic and unit-testable.
 */
export function evaluatePayment(
  request: PaymentRequest,
  observation: PaymentObservation,
  now: number = Date.now(),
): PaymentState {
  const state = (status: PaymentStatus): PaymentState => ({
    status,
    request,
    observation,
    terminal: TERMINAL.has(status),
  });

  const expected = request.amountBaseUnits;
  const confirmed = observation.confirmedBaseUnits;
  const received = observation.receivedBaseUnits;

  // Fully confirmed outcomes take precedence over expiry.
  if (confirmed >= expected) {
    return state(confirmed > expected ? "overpaid" : "paid");
  }
  // Expiry only applies before the amount is confirmed.
  if (now >= request.expiresAt) {
    // If some confirmed funds arrived but not enough, it's an underpayment.
    if (confirmed > 0n) return state("underpaid");
    return state("expired");
  }
  if (!observation.seen || received === 0n) {
    return state("pending");
  }
  if (observation.confirmations < request.requiredConfirmations) {
    // Seen in mempool / not yet deep enough.
    return state(observation.confirmations === 0 ? "detected" : "confirming");
  }
  // Enough confirmations but not enough value.
  return state("underpaid");
}

/** Build a webhook-ready event object from a payment state. */
export function toPaymentEvent(state: PaymentState, now: number = Date.now()): PaymentEvent {
  return {
    type: "payment_status",
    paymentId: state.request.id,
    status: state.status,
    address: state.request.address,
    expectedBaseUnits: state.request.amountBaseUnits.toString(),
    receivedBaseUnits: state.observation.receivedBaseUnits.toString(),
    confirmations: state.observation.confirmations,
    requiredConfirmations: state.request.requiredConfirmations,
    at: now,
  };
}

/**
 * Observe a payment via wallet RPC. Sums unspent outputs paid to the request's
 * address. Assumes a unique, unspent-until-settled address (the recommended
 * pattern). For swept/spent funds, track receipts in your own database.
 */
export async function observePayment(
  client: KingPepeClient,
  request: PaymentRequest,
): Promise<PaymentObservation> {
  const utxos = await client.listUnspent(0, 9_999_999, [request.address]);
  let received = 0n;
  let confirmed = 0n;
  let maxConf = 0;
  let seen = false;
  for (const u of utxos) {
    seen = true;
    const base = rpcAmountToBaseUnits(u.amount);
    received += base;
    if (u.confirmations >= request.requiredConfirmations) confirmed += base;
    if (u.confirmations > maxConf) maxConf = u.confirmations;
  }
  return { receivedBaseUnits: received, confirmedBaseUnits: confirmed, confirmations: maxConf, seen };
}

/** Convenience: observe + evaluate in one call. */
export async function checkPayment(
  client: KingPepeClient,
  request: PaymentRequest,
  now: number = Date.now(),
): Promise<PaymentState> {
  const observation = await observePayment(client, request);
  return evaluatePayment(request, observation, now);
}
