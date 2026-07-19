# Copyright (c) 2026 The KingPepe developers
# Distributed under the MIT software license, see the accompanying LICENSE file.
"""Merchant payment building blocks (pure state machine + RPC observer).

This is NOT a hosted payment processor. Assign a UNIQUE address per payment,
persist every request and its last state, treat webhook events as at-least-once
(idempotent on ``id``), and never trust a payment until it reaches the configured
confirmation depth. Times are Unix milliseconds for cross-language consistency.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any, Literal

from .address import assert_kingpepe_address
from .errors import ValidationError
from .money import rpc_amount_to_base_units
from .uri import KingPepeUri, build_uri

PaymentStatus = Literal[
    "pending", "detected", "confirming", "paid", "underpaid", "overpaid", "expired", "cancelled", "failed"
]

_TERMINAL = {"paid", "overpaid", "expired", "cancelled", "failed"}


def _now_ms() -> int:
    return int(time.time() * 1000)


@dataclass
class PaymentRequest:
    id: str
    address: str
    amount_base_units: int
    required_confirmations: int = 1
    expires_at: int = 0
    label: str | None = None
    message: str | None = None


@dataclass
class PaymentObservation:
    received_base_units: int = 0
    confirmed_base_units: int = 0
    confirmations: int = 0
    seen: bool = False


@dataclass
class PaymentState:
    status: PaymentStatus
    request: PaymentRequest
    observation: PaymentObservation
    terminal: bool


def create_payment_request(
    *,
    id: str,
    address: str,
    amount_base_units: int,
    required_confirmations: int = 1,
    ttl_ms: int = 15 * 60 * 1000,
    label: str | None = None,
    message: str | None = None,
    now: int | None = None,
) -> PaymentRequest:
    if not id:
        raise ValidationError("Payment id is required (idempotency key).")
    assert_kingpepe_address(address)
    if amount_base_units <= 0:
        raise ValidationError("Payment amount must be positive.")
    if required_confirmations < 0:
        raise ValidationError("required_confirmations must be >= 0.")
    started = now if now is not None else _now_ms()
    return PaymentRequest(
        id=id,
        address=address,
        amount_base_units=amount_base_units,
        required_confirmations=required_confirmations,
        expires_at=started + ttl_ms,
        label=label,
        message=message,
    )


def payment_uri(request: PaymentRequest) -> str:
    return build_uri(
        KingPepeUri(
            address=request.address,
            amount_base_units=request.amount_base_units,
            label=request.label,
            message=request.message,
        )
    )


def evaluate_payment(
    request: PaymentRequest, observation: PaymentObservation, now: int | None = None
) -> PaymentState:
    """Pure payment-state evaluator. Deterministic; no I/O."""
    moment = now if now is not None else _now_ms()

    def state(status: PaymentStatus) -> PaymentState:
        return PaymentState(status=status, request=request, observation=observation, terminal=status in _TERMINAL)

    expected = request.amount_base_units
    confirmed = observation.confirmed_base_units
    received = observation.received_base_units

    if confirmed >= expected:
        return state("overpaid" if confirmed > expected else "paid")
    if moment >= request.expires_at:
        return state("underpaid" if confirmed > 0 else "expired")
    if not observation.seen or received == 0:
        return state("pending")
    if observation.confirmations < request.required_confirmations:
        return state("detected" if observation.confirmations == 0 else "confirming")
    return state("underpaid")


def to_payment_event(state: PaymentState, now: int | None = None) -> dict[str, Any]:
    """Build a webhook-ready, JSON-serializable event object."""
    return {
        "type": "payment_status",
        "payment_id": state.request.id,
        "status": state.status,
        "address": state.request.address,
        "expected_base_units": str(state.request.amount_base_units),
        "received_base_units": str(state.observation.received_base_units),
        "confirmations": state.observation.confirmations,
        "required_confirmations": state.request.required_confirmations,
        "at": now if now is not None else _now_ms(),
    }


def observe_payment(client: Any, request: PaymentRequest) -> PaymentObservation:
    """Observe a payment via a sync client's ``list_unspent`` for the address.

    Assumes a unique, unspent-until-settled address. For swept funds, track
    receipts in your own database instead.
    """
    utxos = client.list_unspent(0, 9_999_999, [request.address])
    received = 0
    confirmed = 0
    max_conf = 0
    seen = False
    for u in utxos:
        seen = True
        base = rpc_amount_to_base_units(u["amount"])
        received += base
        if u["confirmations"] >= request.required_confirmations:
            confirmed += base
        max_conf = max(max_conf, u["confirmations"])
    return PaymentObservation(
        received_base_units=received, confirmed_base_units=confirmed, confirmations=max_conf, seen=seen
    )


def check_payment(client: Any, request: PaymentRequest, now: int | None = None) -> PaymentState:
    """Observe + evaluate with a sync client."""
    return evaluate_payment(request, observe_payment(client, request), now)
