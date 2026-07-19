# Examples

Runnable examples for both SDKs. They read configuration from environment
variables (`KINGPEPE_RPC_*`) and contain **no real credentials**. Use
[regtest](../docs/REGTEST_GUIDE.md) for development.

The 15 documented scenarios are covered by these files:

| # | Scenario | TypeScript | Python |
|---|----------|-----------|--------|
| 1 | Connect to a local node | `01_node_info` | `01_node_info` |
| 2 | Display blockchain information | `01_node_info` | `01_node_info` |
| 3 | Display node network information | `01_node_info` | `01_node_info` |
| 4 | Create / load a descriptor wallet | `02_wallet` | `02_wallet` |
| 5 | Generate a receiving address | `02_wallet` | `02_wallet` |
| 6 | Check wallet balance | `02_wallet` | `02_wallet` |
| 7 | List unspent outputs | `02_wallet` | `02_wallet` |
| 8 | Create a `kingpepe:` payment URI | `03_payments` | `03_payments` |
| 9 | Monitor an address / wallet transaction | `03_payments` | `03_payments` |
| 10 | Wait for confirmations | `03_payments` | `03_payments` |
| 11 | Send a payment safely | `03_payments` | `03_payments` |
| 12 | Create and process a PSBT | `04_psbt` | `04_psbt` |
| 13 | Use regtest for local development | all (via env) | all (via env) |
| 14 | Merchant checkout backend | `05_merchant_checkout` | `05_merchant_checkout` |
| 15 | Game rewards backend | `06_game_rewards` | `06_game_rewards` |

## Run

Python (after `pip install -e ".[dev]"` in `packages/python`):

```bash
export KINGPEPE_NETWORK=regtest KINGPEPE_RPC_PORT=18443 \
       KINGPEPE_RPC_USER=dev KINGPEPE_RPC_PASSWORD=dev
python examples/python/01_node_info.py
```

TypeScript (after `npm install && npm run build` in `packages/javascript`, then
`npm link` the package or run inside the package):

```bash
npx tsx examples/typescript/01_node_info.ts
```
