// Copyright (c) 2026 The KingPepe developers
// Distributed under the MIT software license, see the accompanying LICENSE file.

/**
 * A small set of typed shapes for common RPC results. RPC results that carry
 * monetary values report them as JSON numbers (KingPepe Core's wire format);
 * for exact arithmetic, convert to base units with the money helpers on the
 * value you control, and treat these numeric fields as display values.
 */

export interface BlockchainInfo {
  chain: string;
  blocks: number;
  headers: number;
  bestblockhash: string;
  difficulty: number;
  verificationprogress: number;
  initialblockdownload: boolean;
  pruned: boolean;
  size_on_disk: number;
  [key: string]: unknown;
}

export interface NetworkInfo {
  version: number;
  subversion: string;
  protocolversion: number;
  connections: number;
  networkactive: boolean;
  [key: string]: unknown;
}

export interface WalletInfo {
  walletname: string;
  walletversion: number;
  balance: number;
  txcount: number;
  descriptors: boolean;
  [key: string]: unknown;
}

export interface Balances {
  mine: { trusted: number; untrusted_pending: number; immature: number };
  watchonly?: { trusted: number; untrusted_pending: number; immature: number };
  [key: string]: unknown;
}

export interface UnspentOutput {
  txid: string;
  vout: number;
  address?: string;
  amount: number;
  confirmations: number;
  spendable: boolean;
  solvable: boolean;
  [key: string]: unknown;
}

export interface ValidateAddressResult {
  isvalid: boolean;
  address?: string;
  scriptPubKey?: string;
  [key: string]: unknown;
}

/** A generic JSON value returned by an RPC call. */
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
