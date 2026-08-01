/**
 * Typed shapes for common KingPepe Core (Bitcoin Core v31.1 engine) RPC results.
 *
 * These cover the fields most callers use. Nodes may return additional fields;
 * unknown/extra fields are preserved via the `[key: string]: unknown` index.
 */

export interface BlockchainInfo {
  chain: string;
  blocks: number;
  headers: number;
  bestblockhash: string;
  difficulty: number;
  mediantime: number;
  verificationprogress: number;
  initialblockdownload: boolean;
  size_on_disk: number;
  pruned: boolean;
  [key: string]: unknown;
}

export interface NetworkInfo {
  version: number;
  subversion: string;
  protocolversion: number;
  connections: number;
  connections_in?: number;
  connections_out?: number;
  networkactive: boolean;
  relayfee: number;
  [key: string]: unknown;
}

export interface MempoolInfo {
  loaded: boolean;
  size: number;
  bytes: number;
  usage: number;
  total_fee?: number;
  maxmempool: number;
  mempoolminfee: number;
  [key: string]: unknown;
}

export interface Block {
  hash: string;
  confirmations: number;
  height: number;
  version: number;
  merkleroot: string;
  time: number;
  mediantime: number;
  nonce: number;
  bits: string;
  difficulty: number;
  previousblockhash?: string;
  nextblockhash?: string;
  tx: string[] | RawTransaction[];
  [key: string]: unknown;
}

export interface RawTransaction {
  txid: string;
  hash: string;
  version: number;
  size: number;
  vsize: number;
  weight: number;
  locktime: number;
  vin: unknown[];
  vout: unknown[];
  hex?: string;
  [key: string]: unknown;
}

export interface WalletInfo {
  walletname: string;
  walletversion: number;
  balance: number;
  unconfirmed_balance: number;
  immature_balance: number;
  txcount: number;
  keypoolsize: number;
  unlocked_until?: number;
  paytxfee: number;
  [key: string]: unknown;
}

export interface Balances {
  mine: { trusted: number; untrusted_pending: number; immature: number };
  watchonly?: { trusted: number; untrusted_pending: number; immature: number };
  [key: string]: unknown;
}

export interface WalletTransaction {
  address?: string;
  category: string;
  amount: number;
  vout?: number;
  fee?: number;
  confirmations: number;
  txid: string;
  time: number;
  [key: string]: unknown;
}

export interface MiningInfo {
  blocks: number;
  currentblockweight?: number;
  currentblocktx?: number;
  difficulty: number;
  networkhashps: number;
  pooledtx: number;
  chain: string;
  [key: string]: unknown;
}

export interface BlockTemplate {
  version: number;
  previousblockhash: string;
  transactions: unknown[];
  coinbasevalue: number;
  target: string;
  mintime: number;
  curtime: number;
  bits: string;
  height: number;
  [key: string]: unknown;
}

export interface DecodedRawTransaction extends RawTransaction {
  txid: string;
}

export interface SignRawTransactionResult {
  hex: string;
  complete: boolean;
  errors?: unknown[];
}

/** Address types supported by `getNewAddress`. */
export type AddressType = "legacy" | "p2sh-segwit" | "bech32" | "bech32m";

/** A single output for `createRawTransaction` ({ address: amount }). */
export type TxOutput = Record<string, number | string>;

/** An input for `createRawTransaction`. */
export interface TxInput {
  txid: string;
  vout: number;
  sequence?: number;
}
