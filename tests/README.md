# Integration tests (regtest only)

These tests exercise the SDK against a **real** KingPepe Core node on **regtest**.
They are **disabled by default** and only run when explicitly enabled.

## Safety guarantees

- **Regtest only.** They never use mainnet/testnet.
- **Isolated datadir.** Each run creates a fresh temporary data directory and
  launches its own `kingpeped` there.
- **Self-cleaning.** The node is stopped and the temporary datadir is deleted at
  the end of the run — even on failure.
- **Never touches your real wallet.** They do not read or modify your default
  data directory or any mainnet wallet.

## Enable and run

You must provide the path to a `kingpeped` binary. Then:

```bash
export KINGPEPE_SDK_RUN_INTEGRATION=1
export KINGPEPED=/path/to/kingpeped        # required; tests are skipped without it
python -m pip install -e "packages/python[dev]"
pytest tests/integration -q
```

Without `KINGPEPE_SDK_RUN_INTEGRATION=1` (and a valid `KINGPEPED`), the suite is
skipped, so ordinary CI and `pytest` runs never start a node.

## What they cover

- Connectivity and `getblockchaininfo` (asserts `chain == "regtest"`).
- Descriptor wallet creation, address generation (`rkpepe...` HRP), mining, and
  balance.
- A full payment flow: request → URI → pay → confirm → `paid` state.
- Address/URI validation against the live node's `validateaddress`.
