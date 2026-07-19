# Regtest Guide (local development)

**Regtest** is a private, throwaway network where you mine blocks instantly and
coins have no value. Always develop and test against regtest — never your mainnet
wallet.

## Start a regtest node

Run `kingpeped` with an **isolated** data directory so it never touches your real
wallet:

```bash
kingpeped -regtest -datadir=/tmp/kp-regtest \
  -server=1 -rpcbind=127.0.0.1 -rpcallowip=127.0.0.1 \
  -rpcuser=dev -rpcpassword=dev -fallbackfee=0.0002 -daemon
```

Regtest RPC port is **18443**. Point the SDK at it:

```bash
export KINGPEPE_NETWORK=regtest
export KINGPEPE_RPC_HOST=127.0.0.1
export KINGPEPE_RPC_PORT=18443
export KINGPEPE_RPC_USER=dev
export KINGPEPE_RPC_PASSWORD=dev
```

## Fund a wallet and mine

```python
from kingpepe_sdk import KingPepeClient, parse_kpepe

client = KingPepeClient.from_env()
client.create_wallet("dev", descriptors=True)
w = client.with_wallet("dev")

addr = w.get_new_address()
# Mine blocks to your address; coinbase matures after 100 blocks.
w.generate_to_address(101, addr)
print(w.get_balances())
```

Regtest addresses use the `rkpepe` HRP (e.g. `rkpepe1...`).

## Cleaning up

Stop the node and delete the isolated datadir:

```bash
kingpepe-cli -regtest -datadir=/tmp/kp-regtest stop
rm -rf /tmp/kp-regtest
```

## Automated integration tests

The SDK ships optional integration tests that spin up their **own** regtest node
in a temporary datadir and clean it up afterwards. They are **disabled by
default** and only run when explicitly enabled. See
[`../tests/README.md`](../tests/README.md).
