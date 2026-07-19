import pytest

from kingpepe_sdk import (
    KingPepeUri,
    ValidationError,
    assert_kingpepe_address,
    build_uri,
    get_network_for_address,
    is_bitcoin_address,
    is_valid_kingpepe_address_format,
    parse_uri,
)

MAINNET = "kpepe1qqypqxpq9qcrsszg2pvxq6rs0zqg3yyc5afhcv2"
TESTNET = "tkpepe1qqypqxpq9qcrsszg2pvxq6rs0zqg3yyc58a74sj"
REGTEST = "rkpepe1qqypqxpq9qcrsszg2pvxq6rs0zqg3yyc5dtjg0t"
BITCOIN = "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4"


def test_network_detection():
    assert get_network_for_address(MAINNET) == "mainnet"
    assert get_network_for_address(TESTNET) == "testnet"
    assert get_network_for_address(REGTEST) == "regtest"


def test_bitcoin_rejected():
    assert is_bitcoin_address(BITCOIN) is True
    assert get_network_for_address(BITCOIN) is None
    assert is_valid_kingpepe_address_format(BITCOIN) is False
    with pytest.raises(ValidationError):
        assert_kingpepe_address(BITCOIN)


def test_format_and_network_enforcement():
    assert is_valid_kingpepe_address_format(MAINNET, "mainnet") is True
    assert is_valid_kingpepe_address_format(MAINNET, "regtest") is False


def test_uri_build_parse_round_trip():
    uri = build_uri(KingPepeUri(address=REGTEST, amount_base_units=123_456_789, label="Order 42", message="Thanks!"))
    assert uri.startswith(f"kingpepe:{REGTEST}?")
    assert "amount=1.23456789" in uri
    parsed = parse_uri(uri)
    assert parsed.address == REGTEST
    assert parsed.amount_base_units == 123_456_789
    assert parsed.label == "Order 42"
    assert parsed.message == "Thanks!"


def test_uri_no_query():
    assert build_uri(KingPepeUri(address=REGTEST)) == f"kingpepe:{REGTEST}"


def test_uri_rejects_bitcoin_scheme_and_address():
    with pytest.raises(ValidationError):
        parse_uri(f"bitcoin:{BITCOIN}")
    with pytest.raises(ValidationError):
        parse_uri(f"kingpepe:{BITCOIN}")
