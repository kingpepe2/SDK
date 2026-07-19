"""Scenario 14: a minimal merchant checkout backend.

Demonstrates the SDK building blocks + an in-memory order store. In production
use a real database, a unique address per order, and signed webhooks.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Callable

from kingpepe_sdk import (
    KingPepeClient,
    PaymentRequest,
    check_payment,
    create_payment_request,
    parse_kpepe,
    payment_uri,
    to_payment_event,
)


@dataclass
class Order:
    request: PaymentRequest
    status: str = "pending"
    fulfilled: bool = False


ORDERS: dict[str, Order] = {}  # order_id -> Order (use a DB in production)


def create_checkout(wallet: KingPepeClient, order_id: str, price_kpepe: str) -> dict:
    request = create_payment_request(
        id=order_id,
        address=wallet.get_new_address(order_id),  # unique address per order
        amount_base_units=parse_kpepe(price_kpepe),
        required_confirmations=2,
        ttl_ms=20 * 60 * 1000,
    )
    ORDERS[order_id] = Order(request=request)
    return {"order_id": order_id, "uri": payment_uri(request), "address": request.address}


def poll_order(wallet: KingPepeClient, order_id: str, emit: Callable[[dict], None]) -> None:
    """Idempotent: safe to call repeatedly; fulfils the order exactly once."""
    order = ORDERS.get(order_id)
    if order is None or order.fulfilled:
        return
    state = check_payment(wallet, order.request)
    if state.status != order.status:
        order.status = state.status
        emit(to_payment_event(state))  # send a signed webhook in production
    if state.status == "paid" and not order.fulfilled:
        order.fulfilled = True
        print(f"Order {order_id} PAID — fulfilling.")


def _demo() -> None:
    wallet = KingPepeClient.from_env().with_wallet("example-shop")
    checkout = create_checkout(wallet, f"order-{int(time.time())}", "3.00")
    print("Checkout:", checkout)
    poll_order(wallet, checkout["order_id"], lambda e: print("webhook:", e))


if __name__ == "__main__":
    _demo()
