/**
 * @kingpepe2/sdk — Official KingPepe Core JSON-RPC SDK (TypeScript).
 *
 * An RPC client for a KingPepe (KPEPE) node/wallet. It does NOT store coins,
 * private keys, or seed phrases. Compatible with KingPepe Core v31.1.0.
 *
 * Website: https://kingpepe.net
 * Source:  https://github.com/kingpepe2/king-pepe-source-code
 */
export { KingPepeClient } from "./client.js";
export type { KingPepeClientOptions } from "./client.js";
export type { RpcTransportOptions, FetchLike } from "./rpc.js";
export { RpcTransport } from "./rpc.js";
export {
  KingPepeError,
  KingPepeRpcError,
  KingPepeHttpError,
  KingPepeTimeoutError,
  KingPepeValidationError,
  KingPepeSecurityError,
  KingPepeTransportError,
} from "./errors.js";
export * from "./types.js";

/** SDK version and the KingPepe Core version it targets. */
export const SDK_VERSION = "1.0.0";
export const SUPPORTED_CORE_VERSION = "31.1.0";
