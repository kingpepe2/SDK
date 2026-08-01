import { KingPepeSecurityError } from "./errors.js";
import { RpcTransport, type RpcTransportOptions } from "./rpc.js";
import {
  requireHash,
  requireHex,
  requireNumber,
  requirePositive,
  requireString,
  requireUInt,
} from "./validate.js";
import type {
  AddressType,
  Balances,
  Block,
  BlockchainInfo,
  BlockTemplate,
  DecodedRawTransaction,
  MempoolInfo,
  MiningInfo,
  NetworkInfo,
  RawTransaction,
  SignRawTransactionResult,
  TxInput,
  TxOutput,
  WalletInfo,
  WalletTransaction,
} from "./types.js";

export interface KingPepeClientOptions extends RpcTransportOptions {
  /**
   * Opt-in required to call fund-moving or secret-handling wallet methods
   * (sendToAddress, walletPassphrase, backupWallet, signRawTransactionWithWallet,
   * sendRawTransaction). Defaults to `false` so read-only usage is safe by default.
   */
  enableWalletWrites?: boolean;
}

/**
 * Typed JSON-RPC client for a KingPepe Core node/wallet.
 *
 * Compatible with KingPepe Core v31.1.0 (Bitcoin Core v31.1 engine).
 *
 * This is an RPC client only: it never stores coins, private keys, or seed
 * phrases, and it never persists your RPC credentials. Point it at your own
 * node's RPC endpoint (ideally over HTTPS or an SSH tunnel) — never expose the
 * node RPC port directly to the public internet.
 *
 * Every method is asynchronous: input-validation problems surface as a rejected
 * promise (never a synchronous throw), so a single `try/await` or `.catch()`
 * handles all failure modes.
 */
export class KingPepeClient {
  private readonly transport: RpcTransport;
  private readonly walletWrites: boolean;

  constructor(options: KingPepeClientOptions) {
    this.transport = new RpcTransport(options);
    this.walletWrites = options.enableWalletWrites === true;
  }

  /** True if the configured RPC endpoint uses HTTPS. */
  get isSecureEndpoint(): boolean {
    return this.transport.isSecure;
  }

  /** Escape hatch for RPC methods not yet wrapped by a typed helper. */
  async call<T = unknown>(method: string, params: unknown[] = []): Promise<T> {
    requireString(method, "method");
    return this.transport.call<T>(method, params);
  }

  private guardWalletWrites(method: string): void {
    if (!this.walletWrites) {
      throw new KingPepeSecurityError(
        `'${method}' can move funds or handle secrets and is disabled. ` +
          "Construct the client with { enableWalletWrites: true } to allow it.",
      );
    }
  }

  // ---------------------------------------------------------------- Node ----

  async getBlockchainInfo(): Promise<BlockchainInfo> {
    return this.transport.call("getblockchaininfo");
  }

  async getNetworkInfo(): Promise<NetworkInfo> {
    return this.transport.call("getnetworkinfo");
  }

  async getConnectionCount(): Promise<number> {
    return this.transport.call("getconnectioncount");
  }

  async getBlockCount(): Promise<number> {
    return this.transport.call("getblockcount");
  }

  async getBlockHash(height: number): Promise<string> {
    requireUInt(height, "height");
    return this.transport.call("getblockhash", [height]);
  }

  /**
   * Get a block. `verbosity` 0 => hex string, 1 => block with tx ids (default),
   * 2 => block with full decoded transactions.
   */
  async getBlock(blockhash: string, verbosity: 0): Promise<string>;
  async getBlock(blockhash: string, verbosity?: 1 | 2): Promise<Block>;
  async getBlock(blockhash: string, verbosity: 0 | 1 | 2 = 1): Promise<string | Block> {
    requireHash(blockhash, "blockhash");
    return this.transport.call("getblock", [blockhash, verbosity]);
  }

  /** Get a raw transaction. `verbose=false` => hex; `true` => decoded object. */
  async getRawTransaction(txid: string, verbose: false, blockhash?: string): Promise<string>;
  async getRawTransaction(
    txid: string,
    verbose: true,
    blockhash?: string,
  ): Promise<RawTransaction>;
  async getRawTransaction(
    txid: string,
    verbose = false,
    blockhash?: string,
  ): Promise<string | RawTransaction> {
    requireHash(txid, "txid");
    const params: unknown[] = [txid, verbose];
    if (blockhash !== undefined) params.push(requireHash(blockhash, "blockhash"));
    return this.transport.call("getrawtransaction", params);
  }

  async getMempoolInfo(): Promise<MempoolInfo> {
    return this.transport.call("getmempoolinfo");
  }

  // -------------------------------------------------------------- Wallet ----

  async listWallets(): Promise<string[]> {
    return this.transport.call("listwallets");
  }

  async getWalletInfo(): Promise<WalletInfo> {
    return this.transport.call("getwalletinfo");
  }

  async getBalances(): Promise<Balances> {
    return this.transport.call("getbalances");
  }

  /** Generate a fresh receiving address. Read/receive only; not guarded. */
  async getNewAddress(label = "", addressType?: AddressType): Promise<string> {
    const params: unknown[] = [label];
    if (addressType !== undefined) params.push(addressType);
    return this.transport.call("getnewaddress", params);
  }

  async listTransactions(
    label = "*",
    count = 10,
    skip = 0,
    includeWatchOnly = false,
  ): Promise<WalletTransaction[]> {
    requireUInt(count, "count");
    requireUInt(skip, "skip");
    return this.transport.call("listtransactions", [label, count, skip, includeWatchOnly]);
  }

  /** GUARDED: sends KPEPE. Requires `enableWalletWrites`. Returns the txid. */
  async sendToAddress(address: string, amount: number, comment?: string): Promise<string> {
    this.guardWalletWrites("sendToAddress");
    requireString(address, "address");
    requirePositive(amount, "amount");
    const params: unknown[] = [address, amount];
    if (comment !== undefined) params.push(comment);
    return this.transport.call("sendtoaddress", params);
  }

  /**
   * GUARDED: unlocks the wallet with a passphrase for `timeoutSeconds`.
   * The passphrase is placed only in the RPC request body and is never logged.
   */
  async walletPassphrase(passphrase: string, timeoutSeconds: number): Promise<null> {
    this.guardWalletWrites("walletPassphrase");
    requireString(passphrase, "passphrase");
    requireUInt(timeoutSeconds, "timeoutSeconds");
    return this.transport.call("walletpassphrase", [passphrase, timeoutSeconds]);
  }

  /** Re-locks the wallet. Safe; not guarded. */
  async walletLock(): Promise<null> {
    return this.transport.call("walletlock");
  }

  /** GUARDED: writes a wallet backup to `destination` on the node host. */
  async backupWallet(destination: string): Promise<null> {
    this.guardWalletWrites("backupWallet");
    requireString(destination, "destination");
    return this.transport.call("backupwallet", [destination]);
  }

  // -------------------------------------------------------------- Mining ----

  async getMiningInfo(): Promise<MiningInfo> {
    return this.transport.call("getmininginfo");
  }

  async getNetworkHashPs(nblocks = 120, height = -1): Promise<number> {
    requireNumber(nblocks, "nblocks");
    requireNumber(height, "height");
    return this.transport.call("getnetworkhashps", [nblocks, height]);
  }

  async getBlockTemplate(templateRequest?: Record<string, unknown>): Promise<BlockTemplate> {
    const params = templateRequest === undefined ? [] : [templateRequest];
    return this.transport.call("getblocktemplate", params);
  }

  /** Submit a mined block (hex). Returns null on success or a reject reason. */
  async submitBlock(hexData: string): Promise<string | null> {
    requireHex(hexData, "hexData");
    return this.transport.call("submitblock", [hexData]);
  }

  // ------------------------------------------------------- Raw transactions -

  async createRawTransaction(
    inputs: TxInput[],
    outputs: TxOutput | TxOutput[],
    locktime = 0,
  ): Promise<string> {
    if (!Array.isArray(inputs)) {
      requireString(inputs, "inputs"); // triggers a validation error for bad input
    }
    requireUInt(locktime, "locktime");
    return this.transport.call("createrawtransaction", [inputs, outputs, locktime]);
  }

  async decodeRawTransaction(hexString: string): Promise<DecodedRawTransaction> {
    requireHex(hexString, "hexString");
    return this.transport.call("decoderawtransaction", [hexString]);
  }

  /** GUARDED: signs a raw tx with wallet keys. Requires `enableWalletWrites`. */
  async signRawTransactionWithWallet(hexString: string): Promise<SignRawTransactionResult> {
    this.guardWalletWrites("signRawTransactionWithWallet");
    requireHex(hexString, "hexString");
    return this.transport.call("signrawtransactionwithwallet", [hexString]);
  }

  /** GUARDED: broadcasts a signed raw tx. Requires `enableWalletWrites`. */
  async sendRawTransaction(hexString: string, maxFeeRate?: number): Promise<string> {
    this.guardWalletWrites("sendRawTransaction");
    requireHex(hexString, "hexString");
    const params: unknown[] = [hexString];
    if (maxFeeRate !== undefined) params.push(requireNumber(maxFeeRate, "maxFeeRate"));
    return this.transport.call("sendrawtransaction", params);
  }
}
