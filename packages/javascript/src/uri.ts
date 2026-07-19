// Copyright (c) 2026 The KingPepe developers
// Distributed under the MIT software license, see the accompanying LICENSE file.

import { URI_SCHEME } from "./network.js";
import { formatKpepe, parseKpepe } from "./money.js";
import { assertKingPepeAddress } from "./address.js";
import { ValidationError } from "./errors.js";

/** Fields of a parsed or to-be-built `kingpepe:` URI (BIP21-style). */
export interface KingPepeUri {
  address: string;
  /** Amount in integer base units (sat). Omitted if the URI has no amount. */
  amountBaseUnits?: bigint;
  label?: string;
  message?: string;
  /** Any other query parameters (e.g. req-* extensions) preserved verbatim. */
  params?: Record<string, string>;
}

/**
 * Build a `kingpepe:` payment URI. The amount is encoded as a decimal KPEPE
 * value (BIP21 semantics) derived losslessly from integer base units.
 */
export function buildUri(input: KingPepeUri): string {
  assertKingPepeAddress(input.address);
  const query = new URLSearchParams();
  if (input.amountBaseUnits !== undefined) {
    if (input.amountBaseUnits < 0n) throw new ValidationError("URI amount must not be negative.");
    // BIP21 amount is in whole coins; strip trailing zeros for compactness.
    query.set("amount", trimAmount(formatKpepe(input.amountBaseUnits)));
  }
  if (input.label !== undefined) query.set("label", input.label);
  if (input.message !== undefined) query.set("message", input.message);
  for (const [k, v] of Object.entries(input.params ?? {})) {
    if (!query.has(k)) query.set(k, v);
  }
  const qs = query.toString();
  return `${URI_SCHEME}:${input.address}${qs ? `?${qs}` : ""}`;
}

/**
 * Parse a `kingpepe:` URI. Throws {@link ValidationError} for a non-KingPepe
 * scheme (e.g. `bitcoin:`) or a malformed amount.
 */
export function parseUri(uri: string): KingPepeUri {
  const colon = uri.indexOf(":");
  if (colon === -1) throw new ValidationError("Not a URI.");
  const scheme = uri.slice(0, colon).toLowerCase();
  if (scheme === "bitcoin") {
    throw new ValidationError("Refusing a bitcoin: URI in a KingPepe-facing parser.");
  }
  if (scheme !== URI_SCHEME) {
    throw new ValidationError(`Expected a ${URI_SCHEME}: URI, got ${scheme}:`);
  }
  const rest = uri.slice(colon + 1);
  const qIndex = rest.indexOf("?");
  const address = qIndex === -1 ? rest : rest.slice(0, qIndex);
  if (!address) throw new ValidationError("URI is missing an address.");
  assertKingPepeAddress(address);

  const out: KingPepeUri = { address };
  if (qIndex !== -1) {
    const query = new URLSearchParams(rest.slice(qIndex + 1));
    const extra: Record<string, string> = {};
    for (const [key, value] of query.entries()) {
      if (key === "amount") {
        out.amountBaseUnits = parseKpepe(value);
      } else if (key === "label") {
        out.label = value;
      } else if (key === "message") {
        out.message = value;
      } else {
        extra[key] = value;
      }
    }
    if (Object.keys(extra).length > 0) out.params = extra;
  }
  return out;
}

function trimAmount(fixed: string): string {
  if (!fixed.includes(".")) return fixed;
  return fixed.replace(/\.?0+$/, "");
}
