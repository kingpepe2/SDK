// Copyright (c) 2026 The KingPepe developers
// Distributed under the MIT software license, see the accompanying LICENSE file.

import { DEFAULT_RPC_PORT, KingPepeNetwork } from "./network.js";
import { ConfigError } from "./errors.js";

/** TLS options for HTTPS RPC transport (mirrors a subset of node:tls options). */
export interface TlsOptions {
  /** Reject self-signed / untrusted certs. Defaults to true. */
  rejectUnauthorized?: boolean;
  /** PEM CA certificate(s) to trust. */
  ca?: string | string[];
  /** Client certificate (mutual TLS). */
  cert?: string;
  /** Client private key (mutual TLS). Never logged. */
  key?: string;
  /** Expected server name for SNI / cert verification. */
  servername?: string;
}

/** User-supplied client options. */
export interface KingPepeClientOptions {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  /** Wallet name for wallet-scoped RPC (`/wallet/<name>`). */
  wallet?: string;
  /** Request timeout in milliseconds. Defaults to 30000. */
  timeoutMs?: number;
  /** "http" (default) or "https". */
  protocol?: "http" | "https";
  tls?: TlsOptions;
  /** Network, used to pick a default port when `port` is omitted. */
  network?: KingPepeNetwork;
}

/** Fully-resolved configuration used internally by the client. */
export interface ResolvedConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  wallet?: string;
  timeoutMs: number;
  protocol: "http" | "https";
  tls?: TlsOptions;
  network: KingPepeNetwork;
}

const DEFAULTS = {
  host: "127.0.0.1",
  timeoutMs: 30_000,
  protocol: "http" as const,
  network: "mainnet" as KingPepeNetwork,
};

export function resolveConfig(options: KingPepeClientOptions): ResolvedConfig {
  const network = options.network ?? DEFAULTS.network;
  const port = options.port ?? DEFAULT_RPC_PORT[network];
  const username = options.username ?? "";
  const password = options.password ?? "";
  if (!username || !password) {
    throw new ConfigError(
      "Missing RPC credentials. Provide username/password (e.g. via KINGPEPE_RPC_USER / KINGPEPE_RPC_PASSWORD). " +
        "The SDK never uses unauthenticated RPC by default.",
    );
  }
  if (options.timeoutMs !== undefined && options.timeoutMs <= 0) {
    throw new ConfigError("timeoutMs must be a positive number.");
  }
  return {
    host: options.host ?? DEFAULTS.host,
    port,
    username,
    password,
    wallet: options.wallet,
    timeoutMs: options.timeoutMs ?? DEFAULTS.timeoutMs,
    protocol: options.protocol ?? DEFAULTS.protocol,
    tls: options.tls,
    network,
  };
}

/**
 * Build client options from environment variables. Supported:
 *   KINGPEPE_RPC_HOST, KINGPEPE_RPC_PORT, KINGPEPE_RPC_USER, KINGPEPE_RPC_PASSWORD,
 *   KINGPEPE_RPC_WALLET, KINGPEPE_RPC_TIMEOUT, KINGPEPE_RPC_PROTOCOL ("http"|"https"),
 *   KINGPEPE_RPC_TLS_REJECT_UNAUTHORIZED ("0" to disable), KINGPEPE_NETWORK.
 * Credential values are read but never logged.
 */
export function optionsFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  overrides: KingPepeClientOptions = {},
): KingPepeClientOptions {
  const network = (env.KINGPEPE_NETWORK as KingPepeNetwork | undefined) ?? overrides.network;
  const protocol = (env.KINGPEPE_RPC_PROTOCOL as "http" | "https" | undefined) ?? overrides.protocol;
  const tls: TlsOptions | undefined =
    env.KINGPEPE_RPC_TLS_REJECT_UNAUTHORIZED === "0"
      ? { ...overrides.tls, rejectUnauthorized: false }
      : overrides.tls;
  return {
    host: env.KINGPEPE_RPC_HOST ?? overrides.host,
    port: env.KINGPEPE_RPC_PORT ? Number(env.KINGPEPE_RPC_PORT) : overrides.port,
    username: env.KINGPEPE_RPC_USER ?? overrides.username,
    password: env.KINGPEPE_RPC_PASSWORD ?? overrides.password,
    wallet: env.KINGPEPE_RPC_WALLET ?? overrides.wallet,
    timeoutMs: env.KINGPEPE_RPC_TIMEOUT ? Number(env.KINGPEPE_RPC_TIMEOUT) : overrides.timeoutMs,
    protocol,
    tls,
    network,
  };
}
