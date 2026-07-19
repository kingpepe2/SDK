# @kingpepe/sdk

Official TypeScript/JavaScript SDK for **KingPepe Core** — JSON-RPC client, safe
money handling, `kingpepe:` URI tooling, and merchant payment building blocks.

> Targets KingPepe Core v31.1.0. Node.js LTS (>= 18). ESM and CommonJS builds with
> generated type declarations. **Not published to npm yet** — install from source.

## Install (from source)

```bash
cd packages/javascript
npm install
npm run build
```

## Usage

```ts
import { KingPepeClient, formatKpepe } from "@kingpepe/sdk";

// Never hardcode credentials — read them from the environment.
const client = KingPepeClient.fromEnv(); // KINGPEPE_RPC_USER / _PASSWORD / _HOST / _PORT ...

if (!(await client.healthCheck())) throw new Error("node unreachable");

const info = await client.getBlockchainInfo();
console.log(info.chain, info.blocks);

// Any RPC method is reachable via the generic call():
const uptime = await client.call<number>("uptime");
```

### Money (never floats)

```ts
import { parseKpepe, formatKpepe } from "@kingpepe/sdk";
const sats = parseKpepe("1.23456789"); // 123456789n (bigint base units)
formatKpepe(sats); // "1.23456789"
await client.sendToAddress(addr, sats); // amount sent as an exact decimal string
```

### `kingpepe:` URIs and payments

```ts
import { buildUri, createPaymentRequest, checkPayment } from "@kingpepe/sdk";

const req = createPaymentRequest({
  id: "order-42",
  address: await client.getNewAddress("order-42"),
  amountBaseUnits: parseKpepe("2.5"),
  requiredConfirmations: 2,
});
const uri = buildUri({ address: req.address, amountBaseUnits: req.amountBaseUnits });
const state = await checkPayment(client, req); // "pending" | "detected" | "confirming" | "paid" | ...
```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run build` | Build ESM + CJS + type declarations (tsup) |
| `npm test` | Unit tests (vitest) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## Security

- Read credentials from the environment; the SDK never logs them.
- Never expose wallet RPC to the public internet; never put keys/RPC in browser code.

See the repository [`SECURITY.md`](../../SECURITY.md).

## License

[MIT](../../LICENSE).
