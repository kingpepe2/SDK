// Copyright (c) 2026 The KingPepe developers
// Distributed under the MIT software license, see the accompanying LICENSE file.

import { BITCOIN_HRPS, KingPepeNetwork, networkForHrp } from "./network.js";
import { ValidationError } from "./errors.js";

/**
 * Address / Bech32 helpers.
 *
 * These perform BASIC, self-contained format validation (Bech32/Bech32m
 * structure + checksum + KingPepe HRP). They are NOT a substitute for
 * consensus-critical validation. For authoritative validation, ask a KingPepe
 * Core node via the `validateaddress` RPC (see KingPepeClient.validateAddress).
 */

const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

function polymod(values: number[]): number {
  let chk = 1;
  for (const v of values) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) {
      if ((top >> i) & 1) chk ^= GENERATOR[i]!;
    }
  }
  return chk >>> 0;
}

function hrpExpand(hrp: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) >> 5);
  out.push(0);
  for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) & 31);
  return out;
}

type Bech32Decoded = { hrp: string; encoding: "bech32" | "bech32m" };

/** Decode a Bech32/Bech32m string, verifying the checksum. Returns null on failure. */
export function decodeBech32(input: string): Bech32Decoded | null {
  // Reject mixed case (BIP173).
  if (input !== input.toLowerCase() && input !== input.toUpperCase()) return null;
  const s = input.toLowerCase();
  const pos = s.lastIndexOf("1");
  if (pos < 1 || pos + 7 > s.length || s.length > 90) return null;
  const hrp = s.slice(0, pos);
  const dataPart = s.slice(pos + 1);
  const data: number[] = [];
  for (const c of dataPart) {
    const d = CHARSET.indexOf(c);
    if (d === -1) return null;
    data.push(d);
  }
  const chk = polymod([...hrpExpand(hrp), ...data]);
  if (chk === 1) return { hrp, encoding: "bech32" };
  if (chk === 0x2bc830a3) return { hrp, encoding: "bech32m" };
  return null;
}

/** Return the KingPepe network a Bech32 address belongs to, or undefined. */
export function getNetworkForAddress(address: string): KingPepeNetwork | undefined {
  const decoded = decodeBech32(address);
  if (!decoded) return undefined;
  return networkForHrp(decoded.hrp);
}

/** True if the string is a Bitcoin Bech32 address (bc/tb/bcrt). */
export function isBitcoinAddress(address: string): boolean {
  const decoded = decodeBech32(address);
  if (!decoded) return false;
  return (BITCOIN_HRPS as readonly string[]).includes(decoded.hrp);
}

/**
 * Basic format validation for a KingPepe Bech32 address. Optionally require a
 * specific network. Rejects Bitcoin HRPs. Returns true/false; does not throw.
 */
export function isValidKingPepeAddressFormat(address: string, network?: KingPepeNetwork): boolean {
  const decoded = decodeBech32(address);
  if (!decoded) return false;
  const addrNetwork = networkForHrp(decoded.hrp);
  if (!addrNetwork) return false; // not a KingPepe HRP (includes all Bitcoin HRPs)
  if (network && addrNetwork !== network) return false;
  return true;
}

/**
 * Assert a KingPepe address format, throwing {@link ValidationError} with a
 * specific reason. Use in payment/withdrawal flows to fail fast and clearly.
 */
export function assertKingPepeAddress(address: string, network?: KingPepeNetwork): void {
  if (isBitcoinAddress(address)) {
    throw new ValidationError("Refusing a Bitcoin address in a KingPepe-facing operation.");
  }
  if (!isValidKingPepeAddressFormat(address, network)) {
    throw new ValidationError(
      `Not a valid KingPepe ${network ?? ""} address (basic format check). ` +
        "Use the node's validateaddress RPC for authoritative validation.",
    );
  }
}
