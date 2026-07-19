// Copyright (c) 2026 The KingPepe developers
// Distributed under the MIT software license, see the accompanying LICENSE file.

/**
 * KingPepe network identity and constants, verified against KingPepe Core v31.1.
 * These values are network identity — do not substitute Bitcoin values.
 */

export type KingPepeNetwork = "mainnet" | "testnet" | "signet" | "regtest";

/** Base units per whole KPEPE (COIN). 1 KPEPE = 100,000,000 base units ("sat"). */
export const BASE_UNITS_PER_KPEPE = 100_000_000n;

/** Number of decimal places a KPEPE amount may have. */
export const KPEPE_DECIMALS = 8;

/** Maximum money in base units (MAX_MONEY = 21,000,000 * COIN). */
export const MAX_MONEY_BASE_UNITS = 21_000_000n * BASE_UNITS_PER_KPEPE;

/** BIP21-style URI scheme for KingPepe. */
export const URI_SCHEME = "kingpepe";

/** Currency ticker. */
export const CURRENCY_TICKER = "KPEPE";

/** Bech32 human-readable prefixes per network. */
export const BECH32_HRP: Record<KingPepeNetwork, string> = {
  mainnet: "kpepe",
  testnet: "tkpepe",
  signet: "tkpepe",
  regtest: "rkpepe",
};

/** Default JSON-RPC ports per network. */
export const DEFAULT_RPC_PORT: Record<KingPepeNetwork, number> = {
  mainnet: 24027,
  testnet: 34027,
  signet: 61883,
  regtest: 18443,
};

/** Default P2P ports per network (informational). */
export const DEFAULT_P2P_PORT: Record<KingPepeNetwork, number> = {
  mainnet: 24028,
  testnet: 34028,
  signet: 61884,
  regtest: 18444,
};

/** HRPs that belong to Bitcoin and must be rejected by KingPepe-facing tooling. */
export const BITCOIN_HRPS = ["bc", "tb", "bcrt"] as const;

/** All known KingPepe HRPs. */
export const KINGPEPE_HRPS = ["kpepe", "tkpepe", "rkpepe"] as const;

/** Map a Bech32 HRP to its KingPepe network, or undefined if not a KingPepe HRP. */
export function networkForHrp(hrp: string): KingPepeNetwork | undefined {
  switch (hrp.toLowerCase()) {
    case "kpepe":
      return "mainnet";
    case "tkpepe":
      return "testnet";
    case "rkpepe":
      return "regtest";
    default:
      return undefined;
  }
}
