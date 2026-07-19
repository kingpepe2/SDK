"""Scenario 15: a minimal game rewards backend.

Private keys and RPC credentials stay on this backend. Game clients must never
connect to the wallet RPC. The internal ledger is the source of truth for player
balances; the chain is only used for deposits and withdrawals.
"""

from __future__ import annotations

from kingpepe_sdk import (
    KingPepeClient,
    assert_kingpepe_address,
    parse_kpepe,
    rpc_amount_to_base_units,
)

REQUIRED_CONFIRMATIONS = 2

# In-memory ledger for illustration only — use a transactional database.
_balances: dict[str, int] = {}
_credited_outpoints: set[str] = set()  # idempotency for deposits
_withdrawals: dict[str, str] = {}  # withdrawal_id -> txid (idempotency)
_deposit_address: dict[str, str] = {}
_rewards_seen: set[str] = set()


def _credit(player_id: str, amount: int) -> None:
    _balances[player_id] = _balances.get(player_id, 0) + amount


def get_deposit_address(wallet: KingPepeClient, player_id: str) -> str:
    addr = _deposit_address.get(player_id)
    if addr is None:
        addr = wallet.get_new_address(f"player:{player_id}")
        _deposit_address[player_id] = addr
    return addr


def scan_deposits(wallet: KingPepeClient, player_id: str) -> None:
    """Credit confirmed deposits exactly once (idempotent on txid:vout)."""
    addr = get_deposit_address(wallet, player_id)
    for u in wallet.list_unspent(REQUIRED_CONFIRMATIONS, 9_999_999, [addr]):
        key = f"{u['txid']}:{u['vout']}"
        if key in _credited_outpoints:
            continue
        _credited_outpoints.add(key)
        _credit(player_id, rpc_amount_to_base_units(u["amount"]))


def reward_player(player_id: str, reward_id: str, amount_kpepe: str) -> None:
    """Rewards are internal ledger movements — no on-chain transaction."""
    if reward_id in _rewards_seen:  # idempotent on reward id
        return
    _rewards_seen.add(reward_id)
    _credit(player_id, parse_kpepe(amount_kpepe))


def withdraw(
    wallet: KingPepeClient, player_id: str, to_address: str, amount_kpepe: str, withdrawal_id: str
) -> str:
    """Debit before broadcast; validate address; idempotent on withdrawal_id."""
    if withdrawal_id in _withdrawals:
        return _withdrawals[withdrawal_id]
    assert_kingpepe_address(to_address)  # reject Bitcoin/typo addresses
    amount = parse_kpepe(amount_kpepe)
    if _balances.get(player_id, 0) < amount:
        raise ValueError("insufficient balance")
    _balances[player_id] -= amount  # debit before broadcast
    txid = wallet.send_to_address(to_address, amount)
    _withdrawals[withdrawal_id] = txid
    return txid
