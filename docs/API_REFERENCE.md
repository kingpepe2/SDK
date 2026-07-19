# API Reference

Both packages expose the same surface with idiomatic naming (TypeScript
`camelCase`, Python `snake_case`). This page summarizes the API; method
signatures live in the source and generated type declarations.

## Client

- `KingPepeClient` — construct with options or `fromEnv()`/`from_env()`.
- `AsyncKingPepeClient` (Python) — same surface, coroutine returns.
- `withWallet(name)` / `with_wallet(name)` — client scoped to `/wallet/<name>`.
- `healthCheck()` / `health_check()` — returns a boolean; never throws.
- `call(method, params)` — generic low-level JSON-RPC call for **any** RPC.

### Configuration

Options: `host`, `port`, `username`, `password`, `wallet`, `timeoutMs`/`timeout`,
`protocol` (`http`/`https`), `tls`, `network`. Environment variables:
`KINGPEPE_RPC_HOST`, `KINGPEPE_RPC_PORT`, `KINGPEPE_RPC_USER`,
`KINGPEPE_RPC_PASSWORD`, `KINGPEPE_RPC_WALLET`, `KINGPEPE_RPC_TIMEOUT`,
`KINGPEPE_RPC_PROTOCOL`, `KINGPEPE_RPC_TLS_REJECT_UNAUTHORIZED`, `KINGPEPE_NETWORK`.

### Errors

`KingPepeError` (base), `ValidationError`, `ConfigError`, `ConnectionError`,
`TimeoutError`, `HttpError`, `AuthError`, `RpcError` (`code`, `method`, `data`),
`ProtocolError`.

## Typed RPC methods

Thin wrappers over `call()`; only methods that exist in KingPepe Core v31.1 are
exposed. Anything not wrapped is still reachable via `call()`.

- **Blockchain / node:** getBlockchainInfo, getNetworkInfo, getMempoolInfo,
  getMiningInfo, getBlockCount, getBestBlockHash, getBlockHash, getBlock,
  getBlockHeader, getChainTips, getDifficulty, getRawMempool, getMempoolEntry,
  getTxOut, getTxOutSetInfo, uptime, stop.
- **Wallet:** listWallets, listWalletDir, createWallet, loadWallet, unloadWallet,
  getWalletInfo, getBalances, getBalance, getNewAddress, getRawChangeAddress,
  listTransactions, listSinceBlock, listUnspent, lockUnspent, sendToAddress,
  sendMany, sendAll, bumpFee, abandonTransaction, getTransaction, backupWallet,
  walletPassphrase, walletLock, walletPassphraseChange, encryptWallet,
  importDescriptors, listDescriptors.
- **Transactions / PSBT:** getRawTransaction, decodeRawTransaction, decodeScript,
  createRawTransaction, fundRawTransaction, signRawTransactionWithWallet,
  sendRawTransaction, testMempoolAccept, createPsbt, decodePsbt, analyzePsbt,
  combinePsbt, finalizePsbt, walletCreateFundedPsbt, walletProcessPsbt,
  utxoUpdatePsbt.
- **Mining:** getBlockTemplate, submitBlock, submitHeader, generateToAddress,
  generateToDescriptor, getNetworkHashPs.
- **Address (authoritative validation via the node):** validateAddress,
  getAddressInfo.

## Money helpers

`parseKpepe`/`parse_kpepe`, `formatKpepe`/`format_kpepe`,
`kpepeToBaseUnits`/`kpepe_to_base_units`, `baseUnitsToKpepe`/`base_units_to_kpepe`,
`validateAmount`/`validate_amount`, `rpcAmountToBaseUnits`/`rpc_amount_to_base_units`.
Amounts are integer **base units** (1 KPEPE = 100,000,000). Never pass a float.

## Address & URI helpers

`decodeBech32`, `getNetworkForAddress`, `isBitcoinAddress`,
`isValidKingPepeAddressFormat`, `assertKingPepeAddress`; `buildUri`, `parseUri`.
KingPepe HRPs: `kpepe` (mainnet), `tkpepe` (testnet), `rkpepe` (regtest). Bitcoin
HRPs and `bitcoin:` URIs are rejected. For authoritative address validation, call
the node's `validateAddress`.

## Payments

`createPaymentRequest`, `paymentUri`, `evaluatePayment` (pure), `toPaymentEvent`,
`observePayment`, `checkPayment`. States: `pending`, `detected`, `confirming`,
`paid`, `underpaid`, `overpaid`, `expired`, `cancelled`, `failed`. See
[`PAYMENTS.md`](./PAYMENTS.md).
