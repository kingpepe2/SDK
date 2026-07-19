// Copyright (c) 2026 The KingPepe developers
// Distributed under the MIT software license, see the accompanying LICENSE file.

import { BASE_UNITS_PER_KPEPE, KPEPE_DECIMALS, MAX_MONEY_BASE_UNITS } from "./network.js";
import { ValidationError } from "./errors.js";

/**
 * Money handling for KPEPE.
 *
 * KPEPE amounts are ALWAYS represented internally as integer base units
 * (bigint). Binary floating point (`number`) is never used for value-carrying
 * amounts, because it cannot represent decimal fractions exactly. Accept either
 * a validated decimal string or a bigint of base units; never a float.
 */

const AMOUNT_RE = /^-?\d+(\.\d+)?$/;

/**
 * Parse a decimal KPEPE string (e.g. "1.23456789") into integer base units.
 * Rejects floats, more than 8 decimals, and out-of-range values.
 */
export function parseKpepe(amount: string): bigint {
  if (typeof amount !== "string") {
    throw new ValidationError("Amount must be a decimal string, not a number (avoid float precision loss).");
  }
  const trimmed = amount.trim();
  if (!AMOUNT_RE.test(trimmed)) {
    throw new ValidationError(`Invalid KPEPE amount: ${JSON.stringify(amount)}`);
  }
  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [wholePart = "0", fracPartRaw = ""] = unsigned.split(".");
  if (fracPartRaw.length > KPEPE_DECIMALS) {
    throw new ValidationError(`KPEPE supports at most ${KPEPE_DECIMALS} decimal places; got ${fracPartRaw.length}.`);
  }
  const fracPart = fracPartRaw.padEnd(KPEPE_DECIMALS, "0");
  const base = BigInt(wholePart) * BASE_UNITS_PER_KPEPE + BigInt(fracPart || "0");
  const signed = negative ? -base : base;
  assertMoneyRange(signed);
  return signed;
}

/** Format integer base units as a fixed 8-decimal KPEPE string (e.g. "1.23456789"). */
export function formatKpepe(baseUnits: bigint): string {
  if (typeof baseUnits !== "bigint") {
    throw new ValidationError("Base units must be a bigint.");
  }
  const negative = baseUnits < 0n;
  const abs = negative ? -baseUnits : baseUnits;
  const whole = abs / BASE_UNITS_PER_KPEPE;
  const frac = abs % BASE_UNITS_PER_KPEPE;
  const fracStr = frac.toString().padStart(KPEPE_DECIMALS, "0");
  return `${negative ? "-" : ""}${whole.toString()}.${fracStr}`;
}

/** Convert whole/decimal KPEPE (string) to base units. Alias of {@link parseKpepe}. */
export const kpepeToBaseUnits = parseKpepe;

/** Convert base units (bigint) to a KPEPE decimal string. Alias of {@link formatKpepe}. */
export const baseUnitsToKpepe = formatKpepe;

/**
 * Validate that an amount (decimal string or base-unit bigint) is a well-formed,
 * in-range, non-negative KPEPE value. Returns the amount in base units.
 */
export function validateAmount(amount: string | bigint): bigint {
  const baseUnits = typeof amount === "bigint" ? amount : parseKpepe(amount);
  if (baseUnits < 0n) {
    throw new ValidationError("Amount must not be negative.");
  }
  assertMoneyRange(baseUnits);
  return baseUnits;
}

/**
 * Convert base units to a JS number of KPEPE. Provided only for display/among
 * non-value-critical contexts; NEVER use the result to move funds.
 */
export function baseUnitsToKpepeNumberUnsafe(baseUnits: bigint): number {
  return Number(formatKpepe(baseUnits));
}

/**
 * Convert a KPEPE amount as returned by Core RPC (a JSON number) into exact
 * integer base units. Core's wire format for amounts is a decimal number with
 * up to 8 places; every in-range base-unit integer (<= 2.1e15) is exactly
 * representable as a double, so rounding the scaled value is lossless here.
 */
export function rpcAmountToBaseUnits(amount: number): bigint {
  if (!Number.isFinite(amount)) {
    throw new ValidationError(`Invalid RPC amount: ${amount}`);
  }
  const scaled = Math.round(amount * Number(BASE_UNITS_PER_KPEPE));
  const baseUnits = BigInt(scaled);
  assertMoneyRange(baseUnits);
  return baseUnits;
}

function assertMoneyRange(baseUnits: bigint): void {
  const abs = baseUnits < 0n ? -baseUnits : baseUnits;
  if (abs > MAX_MONEY_BASE_UNITS) {
    throw new ValidationError("Amount out of range (exceeds MAX_MONEY).");
  }
}
