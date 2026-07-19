# Copyright (c) 2026 The KingPepe developers
# Distributed under the MIT software license, see the accompanying LICENSE file.
"""Regtest integration flow. See tests/README.md. Disabled by default."""

from __future__ import annotations

from kingpepe_sdk import (
    check_payment,
    create_payment_request,
    get_network_for_address,
    parse_kpepe,
    payment_uri,
)


def _funded_wallet(regtest_client):
    name = "itest"
    if name not in regtest_client.list_wallets():
        regtest_client.create_wallet(name, descriptors=True)
    wallet = regtest_client.with_wallet(name)
    addr = wallet.get_new_address()
    wallet.generate_to_address(101, addr)  # mature coinbase
    return wallet


def test_chain_is_regtest(regtest_client):
    info = regtest_client.get_blockchain_info()
    assert info["chain"] == "regtest"


def test_wallet_address_and_balance(regtest_client):
    wallet = _funded_wallet(regtest_client)
    addr = wallet.get_new_address("recv")
    assert get_network_for_address(addr) == "regtest"
    assert wallet.validate_address(addr)["isvalid"] is True
    balances = wallet.get_balances()
    assert balances["mine"]["trusted"] > 0


def test_payment_flow_reaches_paid(regtest_client):
    wallet = _funded_wallet(regtest_client)
    req = create_payment_request(
        id="itest-order",
        address=wallet.get_new_address("itest-order"),
        amount_base_units=parse_kpepe("1.0"),
        required_confirmations=1,
    )
    assert payment_uri(req).startswith("kingpepe:")

    wallet.send_to_address(req.address, req.amount_base_units)
    wallet.generate_to_address(1, wallet.get_new_address())

    state = check_payment(wallet, req)
    assert state.status == "paid"
    assert state.terminal is True
