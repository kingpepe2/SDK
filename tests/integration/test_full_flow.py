# Copyright (c) 2026 The KingPepe developers
# Distributed under the MIT software license, see the accompanying LICENSE file.
"""Comprehensive regtest integration suite exercising every SDK feature area.

Disabled by default; see tests/README.md. Uses the isolated, self-cleaning
regtest node from conftest.py — never touches mainnet or a real wallet.
"""

from __future__ import annotations

import importlib.util
import pathlib
import sys

import pytest

from kingpepe_sdk import (
    KingPepeUri,
    RpcError,
    ValidationError,
    assert_kingpepe_address,
    build_uri,
    check_payment,
    create_payment_request,
    format_kpepe,
    get_network_for_address,
    observe_payment,
    parse_kpepe,
    parse_uri,
    payment_uri,
    rpc_amount_to_base_units,
    validate_amount,
)

_REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]


def _load_example(name: str, rel: str):
    path = _REPO_ROOT / rel
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    # Register before exec so dataclasses in the example can resolve their module
    # (needed under `from __future__ import annotations`).
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="module")
def wallet(regtest_client):
    """A funded descriptor wallet on the isolated regtest node."""
    name = "itest_full"
    if name not in regtest_client.list_wallets():
        regtest_client.create_wallet(name, descriptors=True)
    w = regtest_client.with_wallet(name)
    # Mine enough blocks to have a mature, spendable coinbase.
    w.generate_to_address(101, w.get_new_address("mining"))
    assert w.get_balances()["mine"]["trusted"] > 0
    return w


# --- RPC wrapper -----------------------------------------------------------
def test_rpc_wrapper(regtest_client):
    assert regtest_client.get_blockchain_info()["chain"] == "regtest"
    assert isinstance(regtest_client.call("uptime"), (int, float))  # generic call()
    assert isinstance(regtest_client.get_block_count(), int)
    with pytest.raises(RpcError):
        regtest_client.get_block_hash(999_999_999)  # typed error from the node


# --- Amount conversion -----------------------------------------------------
def test_amount_conversion(wallet):
    assert parse_kpepe("1.23456789") == 123_456_789
    assert format_kpepe(123_456_789) == "1.23456789"
    assert validate_amount("2.5") == 250_000_000
    # Round-trip a real RPC float amount through exact base units.
    bal = wallet.get_balances()["mine"]["trusted"]
    assert rpc_amount_to_base_units(bal) >= 0


# --- Address generation ----------------------------------------------------
def test_address_generation(wallet):
    addr = wallet.get_new_address("recv")
    assert addr.startswith("rkpepe1")
    assert get_network_for_address(addr) == "regtest"
    assert wallet.validate_address(addr)["isvalid"] is True
    assert wallet.get_address_info(addr)["ismine"] is True
    assert_kingpepe_address(addr, "regtest")  # must not raise
    change = wallet.get_raw_change_address()
    assert change.startswith("rkpepe1")


# --- URI generation --------------------------------------------------------
def test_uri_generation(wallet):
    addr = wallet.get_new_address("uri")
    uri = build_uri(KingPepeUri(address=addr, amount_base_units=parse_kpepe("1.5"), label="Order 7"))
    assert uri.startswith(f"kingpepe:{addr}")
    parsed = parse_uri(uri)
    assert parsed.address == addr and parsed.amount_base_units == 150_000_000
    with pytest.raises(ValidationError):
        parse_uri("bitcoin:bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4")


# --- Wallet API ------------------------------------------------------------
def test_wallet_api(wallet):
    info = wallet.get_wallet_info()
    assert info["descriptors"] is True
    dest = wallet.get_new_address("wallet-send")
    txid = wallet.send_to_address(dest, parse_kpepe("2.5"))
    assert isinstance(txid, str) and len(txid) == 64
    tx = wallet.get_transaction(txid)
    assert tx["txid"] == txid
    wallet.generate_to_address(1, wallet.get_new_address())
    unspent = wallet.list_unspent(1, 9_999_999, [dest])
    assert any(rpc_amount_to_base_units(u["amount"]) == 250_000_000 for u in unspent)


# --- Payment API + deposit monitoring --------------------------------------
def test_payment_api_and_deposit_monitoring(wallet):
    req = create_payment_request(
        id="itest-pay",
        address=wallet.get_new_address("itest-pay"),
        amount_base_units=parse_kpepe("1.0"),
        required_confirmations=2,
    )
    assert payment_uri(req).startswith("kingpepe:")

    # Before payment: pending.
    assert check_payment(wallet, req).status == "pending"

    wallet.send_to_address(req.address, req.amount_base_units)

    # 0-conf: detected; deposit monitoring sees it.
    detected = check_payment(wallet, req)
    assert detected.status in ("detected", "confirming")
    obs = observe_payment(wallet, req)
    assert obs.seen and obs.received_base_units == parse_kpepe("1.0")

    # Confirm to the required depth: paid.
    wallet.generate_to_address(2, wallet.get_new_address())
    paid = check_payment(wallet, req)
    assert paid.status == "paid" and paid.terminal is True


# --- PSBT ------------------------------------------------------------------
def test_psbt(wallet):
    dest = wallet.get_new_address("psbt")
    funded = wallet.wallet_create_funded_psbt([], [{dest: format_kpepe(parse_kpepe("0.5"))}], 0, {"fee_rate": 2})
    assert wallet.analyze_psbt(funded["psbt"])["next"] in ("updater", "signer", "finalizer", "extractor")
    processed = wallet.wallet_process_psbt(funded["psbt"])
    final = wallet.finalize_psbt(processed["psbt"])
    assert final["complete"] is True
    txid = wallet.send_raw_transaction(final["hex"])
    wallet.generate_to_address(1, wallet.get_new_address())
    assert wallet.get_transaction(txid)["confirmations"] >= 1


# --- Merchant SDK example --------------------------------------------------
def test_merchant_example(wallet):
    merchant = _load_example("ex_merchant", "examples/python/05_merchant_checkout.py")
    checkout = merchant.create_checkout(wallet, "itest-merchant", "3.00")
    assert checkout["uri"].startswith("kingpepe:")

    wallet.send_to_address(checkout["address"], parse_kpepe("3.00"))
    wallet.generate_to_address(2, wallet.get_new_address())  # 2 confirmations required

    events: list[dict] = []
    for _ in range(3):
        merchant.poll_order(wallet, "itest-merchant", events.append)
    assert merchant.ORDERS["itest-merchant"].status == "paid"
    assert merchant.ORDERS["itest-merchant"].fulfilled is True
    assert any(e["status"] == "paid" for e in events)


# --- Game rewards example: deposits, rewards, withdrawal (idempotent) ------
def test_game_example_deposit_reward_withdraw(wallet):
    game = _load_example("ex_game", "examples/python/06_game_rewards.py")
    game.REQUIRED_CONFIRMATIONS = 1
    player = "player-1"

    # Deposit: pay the player's unique deposit address, confirm, scan (credit once).
    deposit_addr = game.get_deposit_address(wallet, player)
    assert deposit_addr.startswith("rkpepe1")
    wallet.send_to_address(deposit_addr, parse_kpepe("5.0"))
    wallet.generate_to_address(1, wallet.get_new_address())
    game.scan_deposits(wallet, player)
    credited = game._balances[player]
    assert credited == parse_kpepe("5.0")
    game.scan_deposits(wallet, player)  # idempotent — no double credit
    assert game._balances[player] == credited

    # Reward: internal ledger credit, idempotent on reward id.
    game.reward_player(player, "reward-1", "0.25")
    game.reward_player(player, "reward-1", "0.25")  # duplicate ignored
    assert game._balances[player] == credited + parse_kpepe("0.25")

    # Withdrawal: on-chain send, idempotent on withdrawal id, address-validated.
    to_addr = wallet.get_new_address("withdraw-dest")
    txid = game.withdraw(wallet, player, to_addr, "1.0", "wd-1")
    assert isinstance(txid, str) and len(txid) == 64
    assert game.withdraw(wallet, player, to_addr, "1.0", "wd-1") == txid  # idempotent, sends once
    wallet.generate_to_address(1, wallet.get_new_address())
    assert wallet.get_transaction(txid)["confirmations"] >= 1

    # Withdrawal rejects a Bitcoin address and insufficient balance.
    with pytest.raises(ValidationError):
        game.withdraw(wallet, player, "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4", "1.0", "wd-2")
    # Valid amount, but more than the player's ledger balance -> insufficient balance.
    with pytest.raises(ValueError, match="insufficient balance"):
        game.withdraw(wallet, player, to_addr, "1000000", "wd-3")
