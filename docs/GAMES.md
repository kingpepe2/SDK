# Games Integration

This guide shows a safe, server-side pattern for using KPEPE in a game:
per-player deposits, confirmed crediting, rewards, and withdrawals — with an
internal ledger separate from on-chain balance.

> **Never** connect a game client directly to the wallet RPC. Private keys and
> RPC credentials stay on the game backend. Clients talk only to your game API.

## Architecture

```
[ game client ] --(game API, no keys)--> [ game backend + SDK ] --(RPC)--> [ kingpeped ]
                                                 |
                                                 v
                                     [ ledger DB: players, txs ]
```

Your **ledger database** is the source of truth for player balances. The chain is
used to detect deposits and to broadcast withdrawals; you reconcile the two.

## Deposits (credit only after confirmations)

1. Give each player a **unique deposit address** and persist the mapping:

   ```python
   wallet = client.with_wallet("game")
   deposit_addr = wallet.get_new_address(f"player:{player_id}")
   # store (player_id -> deposit_addr) in your DB
   ```

2. Poll deposits and credit the ledger **once** per confirmed receipt:

   ```python
   from kingpepe_sdk import rpc_amount_to_base_units
   for u in wallet.list_unspent(1, 9_999_999, [deposit_addr]):
       if u["confirmations"] < REQUIRED_CONFIRMATIONS:
           continue
       txid, vout = u["txid"], u["vout"]
       if ledger.already_credited(txid, vout):      # idempotent on (txid, vout)
           continue
       ledger.credit(player_id, rpc_amount_to_base_units(u["amount"]), ref=(txid, vout))
   ```

   Confirmations are not instant — never credit 0-conf deposits for anything of
   value.

## Rewarding a player (internal ledger)

Rewards are usually **internal** ledger movements, not on-chain transactions:

```python
# Idempotent on a reward id so a retry cannot double-reward.
if not ledger.reward_exists(reward_id):
    ledger.credit(player_id, parse_kpepe("0.10"), ref=reward_id)
```

Only touch the chain when a player withdraws.

## Withdrawals (idempotent, validated)

```python
from kingpepe_sdk import assert_kingpepe_address, parse_kpepe

def withdraw(player_id, to_address, amount_str, withdrawal_id):
    assert_kingpepe_address(to_address)                 # reject Bitcoin/typo addresses
    amount = parse_kpepe(amount_str)
    with ledger.transaction():                          # DB transaction
        if ledger.withdrawal_exists(withdrawal_id):     # idempotency: prevent duplicates
            return ledger.withdrawal_txid(withdrawal_id)
        ledger.debit(player_id, amount, ref=withdrawal_id)   # fails if insufficient balance
        txid = wallet.send_to_address(to_address, amount)    # amount = exact base units
        ledger.record_withdrawal(withdrawal_id, txid)
    return txid
```

Guarantees:

- **Debit before broadcast**, inside a DB transaction, so a crash cannot both
  send funds and leave the balance untouched.
- **Idempotency key** (`withdrawal_id`) prevents duplicate sends on retries.
- **Address validation** rejects Bitcoin HRPs / typos before any send.

## Development

Use [regtest](./REGTEST_GUIDE.md) for all development — mine your own coins, test
deposits/withdrawals, and reset freely without touching mainnet.

See the runnable backend example in [`../examples`](../examples).
