# Migration

## Version compatibility

This SDK targets **KingPepe Core v31.1.0**. It exposes only RPC methods verified
to exist in that release. Other Core versions are not verified; if you run a
different version, test against it and pin the SDK version you validated.

## Coming from a generic JSON-RPC client

If you currently call the node with raw HTTP/JSON-RPC, migrate incrementally:

- Replace ad-hoc requests with `client.call(method, params)` — same semantics,
  plus typed errors, timeouts, and wallet scoping.
- Then adopt the typed wrappers (`getBlockchainInfo`, `sendToAddress`, ...).
- Replace float amount math with the money helpers (integer base units).

```python
# before: manual request returning floats
# after:
from kingpepe_sdk import KingPepeClient, parse_kpepe
client = KingPepeClient.from_env()
client.with_wallet("shop").send_to_address(addr, parse_kpepe("1.5"))
```

## Coming from a Bitcoin-oriented library

The JSON-RPC surface is derived from upstream Bitcoin Core, so method names are
familiar. KingPepe-specific differences to account for:

- **Ticker / units:** amounts are KPEPE (8 decimals). Keep integer base units.
- **URI scheme:** `kingpepe:` (not `bitcoin:`). The SDK rejects `bitcoin:` URIs.
- **Address HRPs:** `kpepe` / `tkpepe` / `rkpepe`. The SDK rejects Bitcoin HRPs
  in KingPepe-facing helpers.
- **Default RPC ports:** 24027 / 34027 / 61883 / 18443.
- **Binaries:** `kingpeped`, `kingpepe-cli`, `kingpepe-qt`, `kingpepe-wallet`,
  `kingpepe-tx`, `kingpepe-util`.

## Upgrading the SDK

The SDK is pre-1.0; minor versions may contain breaking changes. Read
[`../CHANGELOG.md`](../CHANGELOG.md) before upgrading and re-run your integration
tests against a regtest node.
