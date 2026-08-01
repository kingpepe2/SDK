# Changelog

All notable changes to `@kingpepe2/sdk` are documented here. This project
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html):

- **MAJOR** — incompatible API changes.
- **MINOR** — backwards-compatible functionality.
- **PATCH** — backwards-compatible fixes.

## [1.0.0] - 2026-08-01

- Initial public npm release (`@kingpepe2/sdk`).
- TypeScript SDK for the KingPepe JSON-RPC interface.
- ESM support.
- CommonJS support (dual build).
- TypeScript type declarations (`.d.ts` / `.d.cts`).
- KingPepe JSON-RPC client (`KingPepeClient`), zero runtime dependencies.
- Node, blockchain, and network methods (`getBlockchainInfo`, `getNetworkInfo`,
  `getConnectionCount`, `getBlockCount`, `getBlockHash`, `getBlock`,
  `getRawTransaction`, `getMempoolInfo`).
- Wallet methods (`listWallets`, `getWalletInfo`, `getBalances`, `getNewAddress`,
  `listTransactions`, `sendToAddress`, `walletPassphrase`, `walletLock`,
  `backupWallet`).
- Mining methods (`getMiningInfo`, `getNetworkHashPs`, `getBlockTemplate`,
  `submitBlock`).
- Raw transaction methods (`createRawTransaction`, `decodeRawTransaction`,
  `signRawTransactionWithWallet`, `sendRawTransaction`).
- Input validation and a structured error hierarchy.
- Per-request timeouts and guarded wallet-write methods; RPC credentials are
  only sent in the `Authorization` header and are never logged.
- KingPepe Core v31.1.0 compatibility.
