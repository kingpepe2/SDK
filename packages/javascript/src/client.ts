// Copyright (c) 2026 The KingPepe developers
// Distributed under the MIT software license, see the accompanying LICENSE file.

import {
  KingPepeClientOptions,
  ResolvedConfig,
  optionsFromEnv,
  resolveConfig,
} from "./config.js";
import { Transport, nodeTransport } from "./transport.js";
import { AuthError, HttpError, ProtocolError, RpcError } from "./errors.js";
import { formatKpepe } from "./money.js";
import {
  Balances,
  BlockchainInfo,
  Json,
  NetworkInfo,
  UnspentOutput,
  ValidateAddressResult,
  WalletInfo,
} from "./types.js";

export interface CallOptions {
  /** Override the wallet for this call (`/wallet/<name>` endpoint). */
  wallet?: string;
  /** Cancel the request. */
  signal?: AbortSignal;
}

interface ClientDeps {
  transport?: Transport;
}

/** An amount accepted by money-carrying methods: base units (bigint) or a decimal KPEPE string. */
export type Amount = bigint | string;

function amountToRpc(amount: Amount): string {
  // Send amounts as decimal strings; KingPepe Core parses these exactly
  // (no binary float rounding).
  return typeof amount === "bigint" ? formatKpepe(amount) : amount;
}

/**
 * JSON-RPC client for a KingPepe Core node.
 *
 * Construct with explicit options or {@link KingPepeClient.fromEnv}. Credentials
 * are held in memory and never logged. Use {@link KingPepeClient.call} for any
 * RPC method; the typed methods below are thin, documented wrappers over it.
 */
export class KingPepeClient {
  private readonly config: ResolvedConfig;
  private readonly transport: Transport;
  private idCounter = 0;

  constructor(options: KingPepeClientOptions, deps: ClientDeps = {}) {
    this.config = resolveConfig(options);
    this.transport = deps.transport ?? nodeTransport;
  }

  /** Build a client from KINGPEPE_RPC_* environment variables (see optionsFromEnv). */
  static fromEnv(overrides: KingPepeClientOptions = {}, deps: ClientDeps = {}): KingPepeClient {
    return new KingPepeClient(optionsFromEnv(process.env, overrides), deps);
  }

  /** Return a new client scoped to a wallet, sharing this client's transport/config. */
  withWallet(wallet: string): KingPepeClient {
    return new KingPepeClient({ ...this.config, wallet }, { transport: this.transport });
  }

  /** The network this client is configured for. */
  get network() {
    return this.config.network;
  }

  /**
   * Low-level JSON-RPC call. Returns the `result` field, or throws a typed error
   * ({@link RpcError}, {@link AuthError}, {@link HttpError}, {@link ProtocolError},
   * plus transport-level ConnectionError/TimeoutError).
   */
  async call<T = Json>(method: string, params: unknown[] = [], opts: CallOptions = {}): Promise<T> {
    const id = ++this.idCounter;
    const body = JSON.stringify({ jsonrpc: "1.0", id, method, params });
    const wallet = opts.wallet ?? this.config.wallet;
    const path = wallet ? `/wallet/${encodeURIComponent(wallet)}` : "/";

    const res = await this.transport(this.config, path, body, opts.signal);

    if (res.statusCode === 401 || res.statusCode === 403) {
      throw new AuthError("RPC authentication failed. Check username/password (rpcauth).", res.statusCode);
    }

    let parsed: { result?: T; error?: { code: number; message: string; data?: unknown } | null };
    try {
      parsed = JSON.parse(res.body);
    } catch {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        throw new HttpError(`RPC HTTP ${res.statusCode} with a non-JSON body.`, res.statusCode);
      }
      throw new ProtocolError("RPC response was not valid JSON.");
    }

    if (parsed && parsed.error) {
      throw new RpcError(parsed.error.message, parsed.error.code, method, parsed.error.data);
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw new HttpError(`RPC HTTP ${res.statusCode}.`, res.statusCode);
    }
    return parsed.result as T;
  }

  /**
   * Lightweight connection health check. Resolves true if the node answers an
   * `uptime` call, false on any transport/RPC failure. Never throws.
   */
  async healthCheck(opts: CallOptions = {}): Promise<boolean> {
    try {
      await this.call("uptime", [], opts);
      return true;
    } catch {
      return false;
    }
  }

  // ---- Blockchain / node ----
  getBlockchainInfo = (o?: CallOptions) => this.call<BlockchainInfo>("getblockchaininfo", [], o);
  getNetworkInfo = (o?: CallOptions) => this.call<NetworkInfo>("getnetworkinfo", [], o);
  getMempoolInfo = (o?: CallOptions) => this.call("getmempoolinfo", [], o);
  getMiningInfo = (o?: CallOptions) => this.call("getmininginfo", [], o);
  getBlockCount = (o?: CallOptions) => this.call<number>("getblockcount", [], o);
  getBestBlockHash = (o?: CallOptions) => this.call<string>("getbestblockhash", [], o);
  getBlockHash = (height: number, o?: CallOptions) => this.call<string>("getblockhash", [height], o);
  getBlock = (blockhash: string, verbosity = 1, o?: CallOptions) =>
    this.call("getblock", [blockhash, verbosity], o);
  getBlockHeader = (blockhash: string, verbose = true, o?: CallOptions) =>
    this.call("getblockheader", [blockhash, verbose], o);
  getChainTips = (o?: CallOptions) => this.call("getchaintips", [], o);
  getDifficulty = (o?: CallOptions) => this.call<number>("getdifficulty", [], o);
  getRawMempool = (verbose = false, o?: CallOptions) => this.call("getrawmempool", [verbose], o);
  getMempoolEntry = (txid: string, o?: CallOptions) => this.call("getmempoolentry", [txid], o);
  getTxOut = (txid: string, n: number, includeMempool = true, o?: CallOptions) =>
    this.call("gettxout", [txid, n, includeMempool], o);
  getTxOutSetInfo = (o?: CallOptions) => this.call("gettxoutsetinfo", [], o);
  uptime = (o?: CallOptions) => this.call<number>("uptime", [], o);
  stop = (o?: CallOptions) => this.call<string>("stop", [], o);

  // ---- Address utilities (authoritative validation via the node) ----
  validateAddress = (address: string, o?: CallOptions) =>
    this.call<ValidateAddressResult>("validateaddress", [address], o);
  getAddressInfo = (address: string, o?: CallOptions) => this.call("getaddressinfo", [address], o);

  // ---- Wallet ----
  listWallets = (o?: CallOptions) => this.call<string[]>("listwallets", [], o);
  listWalletDir = (o?: CallOptions) => this.call("listwalletdir", [], o);
  createWallet = (name: string, options: Record<string, unknown> = {}, o?: CallOptions) =>
    this.call("createwallet", [name, options.disable_private_keys, options.blank, options.passphrase,
      options.avoid_reuse, options.descriptors ?? true, options.load_on_startup, options.external_signer], o);
  loadWallet = (name: string, o?: CallOptions) => this.call("loadwallet", [name], o);
  unloadWallet = (name?: string, o?: CallOptions) => this.call("unloadwallet", name ? [name] : [], o);
  getWalletInfo = (o?: CallOptions) => this.call<WalletInfo>("getwalletinfo", [], o);
  getBalances = (o?: CallOptions) => this.call<Balances>("getbalances", [], o);
  getBalance = (minconf = 0, o?: CallOptions) => this.call<number>("getbalance", ["*", minconf], o);
  getNewAddress = (label = "", addressType?: string, o?: CallOptions) =>
    this.call<string>("getnewaddress", addressType ? [label, addressType] : [label], o);
  getRawChangeAddress = (addressType?: string, o?: CallOptions) =>
    this.call<string>("getrawchangeaddress", addressType ? [addressType] : [], o);
  listTransactions = (label = "*", count = 10, skip = 0, o?: CallOptions) =>
    this.call("listtransactions", [label, count, skip], o);
  listSinceBlock = (blockhash?: string, targetConfirmations = 1, o?: CallOptions) =>
    this.call("listsinceblock", blockhash ? [blockhash, targetConfirmations] : [], o);
  listUnspent = (minconf = 1, maxconf = 9999999, addresses?: string[], o?: CallOptions) =>
    this.call<UnspentOutput[]>("listunspent", addresses ? [minconf, maxconf, addresses] : [minconf, maxconf], o);
  lockUnspent = (unlock: boolean, outputs?: Array<{ txid: string; vout: number }>, o?: CallOptions) =>
    this.call<boolean>("lockunspent", outputs ? [unlock, outputs] : [unlock], o);
  sendToAddress = (address: string, amount: Amount, o?: CallOptions) =>
    this.call<string>("sendtoaddress", [address, amountToRpc(amount)], o);
  sendMany = (amounts: Record<string, Amount>, o?: CallOptions) => {
    const converted: Record<string, string> = {};
    for (const [addr, amt] of Object.entries(amounts)) converted[addr] = amountToRpc(amt);
    return this.call<string>("sendmany", ["", converted], o);
  };
  sendAll = (recipients: unknown[], o?: CallOptions) => this.call("sendall", [recipients], o);
  bumpFee = (txid: string, options?: Record<string, unknown>, o?: CallOptions) =>
    this.call("bumpfee", options ? [txid, options] : [txid], o);
  abandonTransaction = (txid: string, o?: CallOptions) => this.call<null>("abandontransaction", [txid], o);
  getTransaction = (txid: string, includeWatchonly = false, o?: CallOptions) =>
    this.call("gettransaction", [txid, includeWatchonly], o);
  backupWallet = (destination: string, o?: CallOptions) => this.call<null>("backupwallet", [destination], o);
  walletPassphrase = (passphrase: string, timeout: number, o?: CallOptions) =>
    this.call<null>("walletpassphrase", [passphrase, timeout], o);
  walletLock = (o?: CallOptions) => this.call<null>("walletlock", [], o);
  walletPassphraseChange = (oldPassphrase: string, newPassphrase: string, o?: CallOptions) =>
    this.call<null>("walletpassphrasechange", [oldPassphrase, newPassphrase], o);
  encryptWallet = (passphrase: string, o?: CallOptions) => this.call<string>("encryptwallet", [passphrase], o);
  importDescriptors = (requests: unknown[], o?: CallOptions) => this.call("importdescriptors", [requests], o);
  listDescriptors = (priv = false, o?: CallOptions) => this.call("listdescriptors", [priv], o);

  // ---- Transactions / PSBT ----
  getRawTransaction = (txid: string, verbose = false, blockhash?: string, o?: CallOptions) =>
    this.call("getrawtransaction", blockhash ? [txid, verbose, blockhash] : [txid, verbose], o);
  decodeRawTransaction = (hexstring: string, o?: CallOptions) => this.call("decoderawtransaction", [hexstring], o);
  decodeScript = (hexstring: string, o?: CallOptions) => this.call("decodescript", [hexstring], o);
  createRawTransaction = (inputs: unknown[], outputs: unknown, o?: CallOptions) =>
    this.call<string>("createrawtransaction", [inputs, outputs], o);
  fundRawTransaction = (hexstring: string, options?: Record<string, unknown>, o?: CallOptions) =>
    this.call("fundrawtransaction", options ? [hexstring, options] : [hexstring], o);
  signRawTransactionWithWallet = (hexstring: string, o?: CallOptions) =>
    this.call("signrawtransactionwithwallet", [hexstring], o);
  sendRawTransaction = (hexstring: string, o?: CallOptions) => this.call<string>("sendrawtransaction", [hexstring], o);
  testMempoolAccept = (rawtxs: string[], o?: CallOptions) => this.call("testmempoolaccept", [rawtxs], o);
  createPsbt = (inputs: unknown[], outputs: unknown, o?: CallOptions) =>
    this.call<string>("createpsbt", [inputs, outputs], o);
  decodePsbt = (psbt: string, o?: CallOptions) => this.call("decodepsbt", [psbt], o);
  analyzePsbt = (psbt: string, o?: CallOptions) => this.call("analyzepsbt", [psbt], o);
  combinePsbt = (psbts: string[], o?: CallOptions) => this.call<string>("combinepsbt", [psbts], o);
  finalizePsbt = (psbt: string, extract = true, o?: CallOptions) => this.call("finalizepsbt", [psbt, extract], o);
  walletCreateFundedPsbt = (inputs: unknown[], outputs: unknown, locktime = 0, options?: Record<string, unknown>, o?: CallOptions) =>
    this.call("walletcreatefundedpsbt", options ? [inputs, outputs, locktime, options] : [inputs, outputs, locktime], o);
  walletProcessPsbt = (psbt: string, o?: CallOptions) => this.call("walletprocesspsbt", [psbt], o);
  utxoUpdatePsbt = (psbt: string, o?: CallOptions) => this.call<string>("utxoupdatepsbt", [psbt], o);

  // ---- Mining ----
  getBlockTemplate = (templateRequest?: Record<string, unknown>, o?: CallOptions) =>
    this.call("getblocktemplate", templateRequest ? [templateRequest] : [], o);
  submitBlock = (hexdata: string, o?: CallOptions) => this.call("submitblock", [hexdata], o);
  submitHeader = (hexdata: string, o?: CallOptions) => this.call("submitheader", [hexdata], o);
  generateToAddress = (nblocks: number, address: string, maxtries?: number, o?: CallOptions) =>
    this.call<string[]>("generatetoaddress", maxtries !== undefined ? [nblocks, address, maxtries] : [nblocks, address], o);
  generateToDescriptor = (numBlocks: number, descriptor: string, o?: CallOptions) =>
    this.call<string[]>("generatetodescriptor", [numBlocks, descriptor], o);
  getNetworkHashPs = (nblocks = 120, height = -1, o?: CallOptions) =>
    this.call<number>("getnetworkhashps", [nblocks, height], o);
}
