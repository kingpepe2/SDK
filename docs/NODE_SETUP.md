# KingPepe Core Node Setup (secure configuration)

The SDK needs a running KingPepe Core node (`kingpeped`) with JSON-RPC enabled.

## 1. Install / run the node

Get KingPepe Core from https://github.com/kingpepe2/king-pepe-source-code and run
`kingpeped`. It stores data in the default data directory:

- Linux: `~/.kingpepe`
- macOS: `~/Library/Application Support/Kingpepe`
- Windows: `%APPDATA%\Kingpepe`

## 2. Configure RPC securely

Create `kingpepe.conf` in the data directory. Prefer `rpcauth` (a salted hash)
over a plaintext password. Generate credentials with the `rpcauth` helper shipped
with KingPepe Core, then:

```conf
server=1
# Bind RPC to localhost only (never the public internet)
rpcbind=127.0.0.1
rpcallowip=127.0.0.1
# Prefer rpcauth (salted) over rpcuser/rpcpassword:
rpcauth=<service>:<salt>$<hmac>
# txindex is required if you need getrawtransaction for arbitrary txids
txindex=1
```

Default RPC ports (bind the SDK to the one matching your network):

| Network | RPC port |
|---------|----------|
| mainnet | 24027 |
| testnet | 34027 |
| signet  | 61883 |
| regtest | 18443 |

For **remote** access, do **not** open the RPC port to the internet. Instead:

- terminate TLS at a reverse proxy (nginx/caddy) and forward to localhost, or
- use an SSH tunnel / VPN,

then point the SDK at `https://` with certificate verification enabled.

## 3. Point the SDK at the node

Set environment variables (never commit them):

```bash
export KINGPEPE_RPC_HOST=127.0.0.1
export KINGPEPE_RPC_PORT=24027
export KINGPEPE_RPC_USER=<service>
export KINGPEPE_RPC_PASSWORD=<password>
export KINGPEPE_NETWORK=mainnet
```

Then:

```python
from kingpepe_sdk import KingPepeClient
client = KingPepeClient.from_env()
assert client.health_check()
```

## 4. Wallets

KingPepe Core uses descriptor wallets. Create and scope one:

```python
client.create_wallet("shop", descriptors=True)
shop = client.with_wallet("shop")
addr = shop.get_new_address("order-1")
```

See [`REGTEST_GUIDE.md`](./REGTEST_GUIDE.md) for local development without real
funds, and [`../SECURITY.md`](../SECURITY.md) for the full security checklist.
