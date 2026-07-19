import pytest

from kingpepe_sdk import (
    ValidationError,
    format_kpepe,
    parse_kpepe,
    rpc_amount_to_base_units,
    validate_amount,
)


def test_parse_amounts():
    assert parse_kpepe("0") == 0
    assert parse_kpepe("1") == 100_000_000
    assert parse_kpepe("1.23456789") == 123_456_789
    assert parse_kpepe("0.00000001") == 1


def test_format_amounts():
    assert format_kpepe(0) == "0.00000000"
    assert format_kpepe(1) == "0.00000001"
    assert format_kpepe(123_456_789) == "1.23456789"


def test_round_trip():
    for s in ["0.00000000", "12.34567890", "20999999.99999999"]:
        assert format_kpepe(parse_kpepe(s)) == s


def test_reject_float_and_bad_input():
    with pytest.raises(ValidationError):
        parse_kpepe(1.23)  # type: ignore[arg-type]
    with pytest.raises(ValidationError):
        parse_kpepe("1.123456789")  # too many decimals
    with pytest.raises(ValidationError):
        parse_kpepe("abc")
    with pytest.raises(ValidationError):
        parse_kpepe("21000000.00000001")  # out of range


def test_validate_amount():
    with pytest.raises(ValidationError):
        validate_amount("-1")
    assert validate_amount("1.5") == 150_000_000
    assert validate_amount(150_000_000) == 150_000_000


def test_rpc_amount_conversion_is_exact():
    assert rpc_amount_to_base_units(1.23) == 123_000_000
    assert rpc_amount_to_base_units(0.00000001) == 1
    assert rpc_amount_to_base_units(20999999.99999999) == 2_099_999_999_999_999
