# kingpepe-sdk

Official Python SDK for **KingPepe Core** — synchronous and asynchronous JSON-RPC
clients, safe money handling, `kingpepe:` URI tooling, and merchant payment
building blocks. Standard-library only (no runtime dependencies).

> Targets KingPepe Core v31.1.0. Python 3.10+. **Not published to PyPI yet** —
> install from source.

## Install (from source)

```bash
cd packages/python
python -m pip install -e ".[dev]"
```

## Usage (sync)

```python
from kingpepe_sdk import KingPepeClient, parse_kpepe

# Never hardcode credentials — read them from the environment.
client = KingPepeClient.from_env()  # KINGPEPE_RPC_USER / _PASSWORD / _HOST / _PORT ...

if not client.health_check():
    raise SystemExit("node unreachable")

info = client.get_blockchain_info()
print(info["chain"], info["blocks"])

# Any RPC via the generic call():
print(client.call("uptime"))

# Money is integer base units; amounts are sent as exact decimal strings.
client.send_to_address(addr, parse_kpepe("1.5"))
```

## Usage (async)

```python
import asyncio
from kingpepe_sdk import AsyncKingPepeClient

async def main():
    client = AsyncKingPepeClient.from_env()
    print(await client.get_block_count())

asyncio.run(main())
```

## Payments

```python
from kingpepe_sdk import create_payment_request, check_payment, parse_kpepe

req = create_payment_request(
    id="order-42",
    address=client.get_new_address("order-42"),
    amount_base_units=parse_kpepe("2.5"),
    required_confirmations=2,
)
state = check_payment(client, req)  # "pending" | "detected" | "confirming" | "paid" | ...
print(state.status)
```

## Development

```bash
pytest            # unit tests
ruff check .      # lint
mypy              # type check
```

## Security

- Read credentials from the environment; the SDK never logs them (the config
  repr masks the password).
- Never expose wallet RPC to the public internet; never put keys/RPC in clients.

See the repository [`SECURITY.md`](../../SECURITY.md).

## License

[MIT](../../LICENSE).
