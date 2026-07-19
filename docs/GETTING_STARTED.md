# Getting Started

The KingPepe SDK connects your application to a KingPepe Core node over JSON-RPC.
It targets **KingPepe Core v31.1.0**.

## 1. Run a node

Follow [`NODE_SETUP.md`](./NODE_SETUP.md) (or [`REGTEST_GUIDE.md`](./REGTEST_GUIDE.md)
for local development) and export the `KINGPEPE_RPC_*` environment variables.

## 2. Install a package (from source)

TypeScript / JavaScript:

```bash
cd packages/javascript && npm install && npm run build
```

Python:

```bash
cd packages/python && python -m pip install -e ".[dev]"
```

> Packages are not published to npm/PyPI yet.

## 3. Connect and query

TypeScript:

```ts
import { KingPepeClient } from "@kingpepe/sdk";

const client = KingPepeClient.fromEnv();
if (!(await client.healthCheck())) throw new Error("node unreachable");

const info = await client.getBlockchainInfo();
console.log(`chain=${info.chain} height=${info.blocks}`);
```

Python:

```python
from kingpepe_sdk import KingPepeClient

client = KingPepeClient.from_env()
assert client.health_check()
info = client.get_blockchain_info()
print(f"chain={info['chain']} height={info['blocks']}")
```

## 4. Wallets, addresses, amounts

```python
client.create_wallet("shop", descriptors=True)
shop = client.with_wallet("shop")
addr = shop.get_new_address("order-1")

from kingpepe_sdk import parse_kpepe, format_kpepe
amount = parse_kpepe("2.5")          # integer base units (bigint/int) — never a float
shop.send_to_address(addr, amount)   # sent as an exact decimal string
```

## 5. Next steps

- [Payments](./PAYMENTS.md) — accept KPEPE with confirmations and webhooks.
- [Games](./GAMES.md) — deposits, rewards, withdrawals, idempotency.
- [API reference](./API_REFERENCE.md) — all client methods and helpers.
- [Examples](../examples) — runnable TypeScript and Python programs.
