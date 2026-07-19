import pytest

from kingpepe_sdk import (
    PaymentObservation,
    PaymentRequest,
    ValidationError,
    create_payment_request,
    evaluate_payment,
    payment_uri,
    to_payment_event,
)

ADDR = "rkpepe1qqypqxpq9qcrsszg2pvxq6rs0zqg3yyc5dtjg0t"
T0 = 1_000_000


def req(**over) -> PaymentRequest:
    base = dict(
        id="pay_1",
        address=ADDR,
        amount_base_units=100_000_000,
        required_confirmations=2,
        expires_at=T0 + 60_000,
    )
    base.update(over)
    return PaymentRequest(**base)


def obs(**over) -> PaymentObservation:
    base = dict(received_base_units=0, confirmed_base_units=0, confirmations=0, seen=False)
    base.update(over)
    return PaymentObservation(**base)


def test_create_validation():
    with pytest.raises(ValidationError):
        create_payment_request(id="", address=ADDR, amount_base_units=1)
    with pytest.raises(ValidationError):
        create_payment_request(id="x", address=ADDR, amount_base_units=0)
    with pytest.raises(ValidationError):
        create_payment_request(id="x", address="bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4", amount_base_units=1)


def test_create_sets_expiry_and_uri():
    r = create_payment_request(id="x", address=ADDR, amount_base_units=150_000_000, ttl_ms=1000, now=T0)
    assert r.expires_at == T0 + 1000
    assert "amount=1.5" in payment_uri(r)


def test_states():
    assert evaluate_payment(req(), obs(), T0).status == "pending"
    assert evaluate_payment(req(), obs(seen=True, received_base_units=100_000_000, confirmations=0), T0).status == "detected"
    assert evaluate_payment(req(), obs(seen=True, received_base_units=100_000_000, confirmations=1), T0).status == "confirming"
    paid = evaluate_payment(req(), obs(seen=True, received_base_units=100_000_000, confirmed_base_units=100_000_000, confirmations=2), T0)
    assert paid.status == "paid" and paid.terminal is True
    assert evaluate_payment(req(), obs(seen=True, received_base_units=120_000_000, confirmed_base_units=120_000_000, confirmations=3), T0).status == "overpaid"
    assert evaluate_payment(req(), obs(seen=True, received_base_units=40_000_000, confirmed_base_units=40_000_000, confirmations=2), T0).status == "underpaid"
    assert evaluate_payment(req(), obs(), T0 + 120_000).status == "expired"


def test_confirmation_beats_expiry():
    s = evaluate_payment(
        req(),
        obs(seen=True, received_base_units=100_000_000, confirmed_base_units=100_000_000, confirmations=2),
        T0 + 120_000,
    )
    assert s.status == "paid"


def test_event_is_serializable_and_carries_id():
    s = evaluate_payment(req(), obs(seen=True, received_base_units=100_000_000), T0)
    ev = to_payment_event(s, T0)
    assert ev["payment_id"] == "pay_1"
    assert ev["expected_base_units"] == "100000000"
    assert ev["at"] == T0
    import json

    json.dumps(ev)  # must be JSON-serializable
