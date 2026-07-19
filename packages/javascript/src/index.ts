// Copyright (c) 2026 The KingPepe developers
// Distributed under the MIT software license, see the accompanying LICENSE file.

/**
 * @kingpepe/sdk — official TypeScript/JavaScript SDK for KingPepe Core.
 *
 * @example
 * ```ts
 * import { KingPepeClient } from "@kingpepe/sdk";
 * const client = KingPepeClient.fromEnv();
 * const info = await client.getBlockchainInfo();
 * ```
 */

export { KingPepeClient } from "./client.js";
export type { Amount, CallOptions } from "./client.js";

export {
  KingPepeError,
  ValidationError,
  ConfigError,
  ConnectionError,
  TimeoutError,
  HttpError,
  AuthError,
  RpcError,
  ProtocolError,
} from "./errors.js";

export type {
  KingPepeClientOptions,
  ResolvedConfig,
  TlsOptions,
} from "./config.js";
export { optionsFromEnv, resolveConfig } from "./config.js";

export {
  parseKpepe,
  formatKpepe,
  kpepeToBaseUnits,
  baseUnitsToKpepe,
  validateAmount,
  rpcAmountToBaseUnits,
  baseUnitsToKpepeNumberUnsafe,
} from "./money.js";

export {
  decodeBech32,
  getNetworkForAddress,
  isBitcoinAddress,
  isValidKingPepeAddressFormat,
  assertKingPepeAddress,
} from "./address.js";

export { buildUri, parseUri } from "./uri.js";
export type { KingPepeUri } from "./uri.js";

export {
  BASE_UNITS_PER_KPEPE,
  KPEPE_DECIMALS,
  MAX_MONEY_BASE_UNITS,
  URI_SCHEME,
  CURRENCY_TICKER,
  BECH32_HRP,
  DEFAULT_RPC_PORT,
  DEFAULT_P2P_PORT,
  KINGPEPE_HRPS,
  BITCOIN_HRPS,
  networkForHrp,
} from "./network.js";
export type { KingPepeNetwork } from "./network.js";

export {
  createPaymentRequest,
  paymentUri,
  evaluatePayment,
  toPaymentEvent,
  observePayment,
  checkPayment,
} from "./payments.js";
export type {
  PaymentStatus,
  PaymentRequest,
  PaymentObservation,
  PaymentState,
  PaymentEvent,
  CreatePaymentRequestInput,
} from "./payments.js";

export type {
  BlockchainInfo,
  NetworkInfo,
  WalletInfo,
  Balances,
  UnspentOutput,
  ValidateAddressResult,
  Json,
} from "./types.js";
