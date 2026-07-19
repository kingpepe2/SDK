# KingPepe SDK

Official multi-language SDK for integrating **KingPepe Core** into websites, payment
systems, online stores, mobile/desktop apps, games, exchanges, custodial and merchant
systems, explorers, mining-pool services, and backend servers.

The initial focus is **stable JSON-RPC integration** with a KingPepe Core node
(`kingpeped`), plus safe money handling, `kingpepe:` URI tooling, and a
merchant-oriented payments layer.

> **Project maturity:** early / pre-1.0. The API may change before a tagged release.
> Targets **KingPepe Core v31.1.0**. Other Core versions are not verified yet.

## Supported languages

| Language | Package | Status |
|----------|---------|--------|
| TypeScript / JavaScript (Node.js LTS) | `@kingpepe/sdk` | Supported |
| Python (3.10+) | `kingpepe-sdk` | Supported |

Additional languages (C#, Java, Go, PHP, Rust, Unity, Unreal) are planned but **not
yet available** — the monorepo is structured so they can be added without
restructuring. Do not assume an unlisted language is shipped.

> These packages are **not published** to npm or PyPI yet. Install from source (below).

## KingPepe Core identity (verified against Core v31.1)

| | Value |
|---|---|
| Product | KingPepe Core |
| Ticker | `KPEPE` (8 decimals; 1 KPEPE = 100,000,000 base units "sat") |
| URI scheme | `kingpepe:` |
| Bech32 HRP | mainnet `kpepe` · testnet `tkpepe` · regtest `rkpepe` |
| Default RPC port | mainnet `24027` · testnet `34027` · signet `61883` · regtest `18443` |
| Binaries | `kingpeped`, `kingpepe-cli`, `kingpepe-qt`, `kingpepe-wallet`, `kingpepe-tx`, `kingpepe-util` |

## Install (from source)

TypeScript / JavaScript:

```bash
cd packages/javascript
npm install
npm run build
```

Python:

```bash
cd packages/python
python -m pip install -e ".[dev]"
```

## Quick start

TypeScript:

```ts
import { KingPepeClient } from "@kingpepe/sdk";

// Reads KINGPEPE_RPC_* env vars; never hardcode credentials.
const client = KingPepeClient.fromEnv();
const info = await client.getBlockchainInfo();
console.log(info.chain, info.blocks);
```

Python:

```python
from kingpepe_sdk import KingPepeClient

client = KingPepeClient.from_env()  # reads KINGPEPE_RPC_* env vars
info = client.get_blockchain_info()
print(info["chain"], info["blocks"])
```

## Features

- Generic `call(method, params)` plus typed/documented wrappers for stable Core RPC
  categories: blockchain, wallet, transactions/PSBT, mining.
- Configurable host/port/user/password/wallet/timeout/TLS; environment-variable config.
- HTTP and HTTPS transport, automatic JSON-RPC request IDs, request timeouts,
  cancellation, connection health checks, and clear typed errors.
- Safe money handling: integer base units only — **no binary floating point** for KPEPE.
- `kingpepe:` URI build/parse and Bech32-HRP / network utilities that **reject**
  Bitcoin schemes and HRPs.
- Merchant **payments** building blocks (payment requests, confirmations, status
  states, webhook-ready events) — reusable pieces, not a hosted processor.
- Server-side **games** integration examples (deposits, rewards, withdrawals,
  idempotency) with an internal-ledger pattern.

## Security (read before deploying)

- **Never** expose wallet RPC to the public internet. Bind to localhost / a private
  network and put TLS or a secure reverse proxy in front for remote access.
- **Never** put private keys, seeds, RPC passwords, or tokens in browser/client code.
- Credentials come from environment variables and are never logged.

See [`SECURITY.md`](./SECURITY.md) and [`docs/THREAT_MODEL.md`](./docs/THREAT_MODEL.md).

## Documentation

- [Getting started](./docs/GETTING_STARTED.md)
- [API reference](./docs/API_REFERENCE.md)
- [Payments](./docs/PAYMENTS.md)
- [Games](./docs/GAMES.md)
- [Node setup](./docs/NODE_SETUP.md)
- [Regtest guide](./docs/REGTEST_GUIDE.md)
- [Migration](./docs/MIGRATION.md)
- [Contributing](./CONTRIBUTING.md) · [Changelog](./CHANGELOG.md)

## Related

- KingPepe Core: https://github.com/kingpepe2/king-pepe-source-code

## License

[MIT](./LICENSE). Portions derived from Bitcoin Core (MIT) — attribution retained.
