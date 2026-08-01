# KingPepe SDK

Official JavaScript and TypeScript SDK for communicating with KingPepe Core v31.1.0 through JSON-RPC.

[![npm version](https://img.shields.io/npm/v/@kingpepe2/sdk.svg)](https://www.npmjs.com/package/@kingpepe2/sdk)
[![npm downloads](https://img.shields.io/npm/dm/@kingpepe2/sdk.svg)](https://www.npmjs.com/package/@kingpepe2/sdk)
[![license](https://img.shields.io/npm/l/@kingpepe2/sdk.svg)](./LICENSE)

- **npm package:** https://www.npmjs.com/package/@kingpepe2/sdk
- **KingPepe website:** https://kingpepe.net
- **KingPepe Core:** https://github.com/kingpepe2/king-pepe-source-code
- **SDK source:** https://github.com/kingpepe2/SDK

> **This SDK does not store coins, private keys, or seed phrases.** It is only a
> JSON-RPC client that sends requests to a KingPepe node/wallet that *you* run and
> control. Your keys and funds stay in your node's wallet, never in this library.

| | |
|---|---|
| Package | `@kingpepe2/sdk` |
| Current version | `1.0.0` |
| KingPepe Core compatibility | `v31.1.0` |
| Symbol | `KPEPE` |
| SLIP-0044 coin type | `6789` |

## Installation

```bash
npm install @kingpepe2/sdk
```

Requires Node.js **>= 18** (for the global `fetch` and `AbortController`). Zero
runtime dependencies. Ships both **ESM** and **CommonJS** builds with TypeScript
declarations.

## Usage (TypeScript / ESM)

```ts
import { KingPepeClient } from "@kingpepe2/sdk";

const client = new KingPepeClient({
  url: "http://127.0.0.1:24027",
  username: process.env.KINGPEPE_RPC_USER,
  password: process.env.KINGPEPE_RPC_PASSWORD,
});

const blockchain = await client.getBlockchainInfo();
console.log(blockchain);
```

## Usage (CommonJS)

```js
const { KingPepeClient } = require("@kingpepe2/sdk");

const client = new KingPepeClient({
  url: "http://127.0.0.1:24027",
  username: process.env.KINGPEPE_RPC_USER,
  password: process.env.KINGPEPE_RPC_PASSWORD,
});

client.getBlockCount().then((height) => console.log("height:", height));
```

## Methods

Every method is asynchronous and returns a `Promise`. Input-validation problems
surface as a rejected promise (never a synchronous throw).

### Node & network information

| Method | RPC |
|---|---|
| `getNetworkInfo()` | `getnetworkinfo` |
| `getConnectionCount()` | `getconnectioncount` |
| `getMempoolInfo()` | `getmempoolinfo` |

### Blockchain

| Method | RPC |
|---|---|
| `getBlockchainInfo()` | `getblockchaininfo` |
| `getBlockCount()` | `getblockcount` |
| `getBlockHash(height)` | `getblockhash` |
| `getBlock(blockhash, verbosity?)` | `getblock` |
| `getRawTransaction(txid, verbose?, blockhash?)` | `getrawtransaction` |

### Wallet

| Method | RPC |
|---|---|
| `listWallets()` | `listwallets` |
| `getWalletInfo()` | `getwalletinfo` |
| `getBalances()` | `getbalances` |
| `getNewAddress(label?, addressType?)` | `getnewaddress` |
| `listTransactions(label?, count?, skip?, includeWatchOnly?)` | `listtransactions` |
| `sendToAddress(address, amount, comment?)` * | `sendtoaddress` |
| `walletPassphrase(passphrase, timeoutSeconds)` * | `walletpassphrase` |
| `walletLock()` | `walletlock` |
| `backupWallet(destination)` * | `backupwallet` |

### Mining

| Method | RPC |
|---|---|
| `getMiningInfo()` | `getmininginfo` |
| `getNetworkHashPs(nblocks?, height?)` | `getnetworkhashps` |
| `getBlockTemplate(templateRequest?)` | `getblocktemplate` |
| `submitBlock(hexData)` | `submitblock` |

### Raw transactions

| Method | RPC |
|---|---|
| `createRawTransaction(inputs, outputs, locktime?)` | `createrawtransaction` |
| `decodeRawTransaction(hexString)` | `decoderawtransaction` |
| `signRawTransactionWithWallet(hexString)` * | `signrawtransactionwithwallet` |
| `sendRawTransaction(hexString, maxFeeRate?)` * | `sendrawtransaction` |

`*` = guarded (see below). Need an RPC method not wrapped yet? Use the typed
escape hatch: `await client.call<MyType>("somerpcmethod", [arg1, arg2])`.

## Wallet writes are off by default

Fund-moving and secret-handling methods (`sendToAddress`, `sendRawTransaction`,
`signRawTransactionWithWallet`, `walletPassphrase`, `backupWallet`) are
**disabled** unless you explicitly opt in, protecting read-only integrations from
accidentally spending funds:

```ts
const wallet = new KingPepeClient({
  url: "https://your-node.example:24027/wallet/mywallet",
  username: process.env.KINGPEPE_RPC_USER,
  password: process.env.KINGPEPE_RPC_PASSWORD,
  enableWalletWrites: true, // required for the guarded methods
});

await wallet.walletPassphrase(process.env.KINGPEPE_WALLET_PASSPHRASE, 60);
try {
  const txid = await wallet.sendToAddress("kpepe1q...", 1.25);
  console.log("sent", txid);
} finally {
  await wallet.walletLock();
}
```

## Authentication configuration

Pass RPC credentials explicitly — the SDK never reads config files or environment
variables on its own:

```ts
new KingPepeClient({
  url: "https://your-node.example:24027/",
  username: process.env.KINGPEPE_RPC_USER,      // from your environment / secret manager
  password: process.env.KINGPEPE_RPC_PASSWORD,
});
```

Credentials are sent only in the HTTP `Authorization` header (HTTP Basic) and are
**never logged** by the SDK.

## Timeout configuration

Each request has a per-call timeout (default `30000` ms). A timed-out request is
aborted and rejects with `KingPepeTimeoutError`:

```ts
const client = new KingPepeClient({ url: "http://127.0.0.1:24027", timeoutMs: 5000 });
```

## Secure RPC usage

- **Prefer HTTPS** (or an SSH tunnel / private network). Use
  `client.isSecureEndpoint` to confirm your endpoint is HTTPS.
- Provide a custom `fetch` or extra `headers` when you need a proxy or bespoke
  transport.

## Error handling

All errors extend `KingPepeError`:

| Class | Meaning |
|---|---|
| `KingPepeRpcError` | The node returned a JSON-RPC error (`.code`, `.data`). |
| `KingPepeHttpError` | Non-2xx HTTP response (`.status`). |
| `KingPepeTimeoutError` | The request exceeded `timeoutMs`. |
| `KingPepeValidationError` | Client-side input validation failed. |
| `KingPepeSecurityError` | A guarded method was called without opt-in. |
| `KingPepeTransportError` | Network/transport failure. |

```ts
import { KingPepeRpcError } from "@kingpepe2/sdk";

try {
  await client.getBlock("not-a-hash");
} catch (err) {
  if (err instanceof KingPepeRpcError) console.error("rpc code", err.code);
}
```

## TypeScript types

The package ships full type declarations. Result shapes such as `BlockchainInfo`,
`NetworkInfo`, `MempoolInfo`, `Block`, `WalletInfo`, `Balances`, `MiningInfo`,
`BlockTemplate`, and `RawTransaction` are exported, along with the client options
(`KingPepeClientOptions`) and every error class.

```ts
import type { BlockchainInfo, KingPepeClientOptions } from "@kingpepe2/sdk";
```

## ⚠️ Security

- **Never expose KingPepe RPC directly to the public internet.**
- **Never commit RPC credentials.**
- **Use environment variables or a secure secret manager.**
- **Restrict RPC access to localhost or a trusted private network.**
- **Wallet-send methods can transfer real funds.**
- **The SDK does not store private keys or seed phrases.**

## Versioning

This package follows [Semantic Versioning](https://semver.org). Breaking API
changes bump the MAJOR version; see [CHANGELOG.md](./CHANGELOG.md).

## License

[MIT](./LICENSE) © The KingPepe Core developers
