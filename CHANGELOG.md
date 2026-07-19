# Changelog

All notable changes to the KingPepe SDK are documented here. This project follows
[Semantic Versioning](https://semver.org/). Pre-1.0 minor versions may include
breaking changes.

## [Unreleased]

### Added

- **TypeScript / JavaScript SDK** (`@kingpepe/sdk`): `KingPepeClient` JSON-RPC
  client (HTTP/HTTPS, env config, wallet scoping, health checks, typed errors,
  generic `call()` + typed wrappers for Core v31.1 RPC categories); money helpers
  on integer base units; Bech32 address validation and `kingpepe:` URI tooling;
  payment building blocks. ESM + CJS + type declarations.
- **Python SDK** (`kingpepe-sdk`): synchronous `KingPepeClient` and asynchronous
  `AsyncKingPepeClient` (standard-library transport), the same typed method
  surface, money/address/URI/payment helpers, structured exceptions, `py.typed`.
- Merchant **payments** module (pure state machine + RPC observer + webhook
  events) and server-side **games** integration guide.
- Documentation (getting started, API reference, payments, games, node setup,
  regtest, migration, security, threat model), runnable examples, and a
  KingPepe-branded CI workflow (lint, typecheck, tests, build verification,
  secret scan, docs check).

### Notes

- Targets **KingPepe Core v31.1.0**.
- Not yet published to npm or PyPI.
