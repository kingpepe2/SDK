# Payments

The payments module provides reusable building blocks for accepting KPEPE. It is
**not** a hosted payment processor — you compose these pieces with your own
database and web server.

## Flow

1. **Create a request** with a unique id and a unique receiving address:

   ```python
   from kingpepe_sdk import create_payment_request, payment_uri, parse_kpepe

   shop = client.with_wallet("shop")
   req = create_payment_request(
       id="order-42",                       # your idempotency key
       address=shop.get_new_address("order-42"),
       amount_base_units=parse_kpepe("2.5"),
       required_confirmations=2,
       ttl_ms=15 * 60 * 1000,
   )
   uri = payment_uri(req)                    # kingpepe:rkpepe1...?amount=2.5&label=...
   ```

   Persist `req` (id, address, amount, expiry, required confirmations) in your
   database. Show the `uri` (and a QR code) to the buyer.

2. **Poll or subscribe** for status. `check_payment` observes the address via
   wallet RPC and returns a state:

   ```python
   from kingpepe_sdk import check_payment
   state = check_payment(shop, req)         # observe + evaluate
   print(state.status)                      # pending | detected | confirming | paid | ...
   ```

   The evaluator is pure and unit-testable — you can also observe once and call
   `evaluate_payment(req, observation)` yourself.

3. **React to state transitions.** Only fulfil an order when `status == "paid"`.
   Emit a webhook event on change:

   ```python
   from kingpepe_sdk import to_payment_event
   event = to_payment_event(state)          # JSON-serializable, webhook-ready
   ```

## States

| State | Meaning |
|-------|---------|
| `pending` | No transaction seen yet |
| `detected` | Seen in mempool (0 confirmations) |
| `confirming` | Seen, but below the required confirmation depth |
| `paid` | Enough confirmed value received (exact amount) |
| `overpaid` | Confirmed value exceeds the requested amount |
| `underpaid` | Confirmed value is less than requested (after confs or expiry) |
| `expired` | TTL passed with nothing confirmed |
| `cancelled` | Cancelled by the merchant (set in your own store) |
| `failed` | Terminal failure (set by your application) |

## Money safety

Amounts are integer **base units** end-to-end. Requests store
`amount_base_units`; observations sum base units; the SDK converts Core's float
RPC amounts to exact base units. Never compare or store KPEPE as a float.

## Idempotency, uniqueness, reconciliation

- Use a **unique address per payment** so receipts are unambiguous.
- Use the payment **id as an idempotency key**; make webhook handlers safe to run
  more than once (webhooks are at-least-once).
- Keep a **transactional database** as the source of truth for order state and
  reconcile it against the chain; do not derive business state from wallet
  balance alone.

## Webhooks

- Sign outgoing webhooks (e.g. HMAC-SHA256 over the body) and verify on receipt.
- Include a timestamp/nonce and reject stale or replayed deliveries.
- Retry with backoff; the receiver must be idempotent on the payment id.
