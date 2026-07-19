"""Scenarios 8-11: build a kingpepe: URI, monitor an address, wait for
confirmations, and send a payment safely. Use regtest for development."""

from __future__ import annotations

import time

from kingpepe_sdk import (
    KingPepeClient,
    check_payment,
    create_payment_request,
    parse_kpepe,
    payment_uri,
)


def main() -> None:
    client = KingPepeClient.from_env()
    wallet = client.with_wallet("example-shop")

    # 8) Create a payment request and its kingpepe: URI.
    req = create_payment_request(
        id=f"order-{int(time.time())}",
        address=wallet.get_new_address("checkout"),
        amount_base_units=parse_kpepe("1.25"),
        required_confirmations=1,
        ttl_ms=30 * 60 * 1000,
    )
    print("Pay to:", payment_uri(req))

    # 11) (demo) On regtest, pay it ourselves so the example is self-contained.
    #     In production the buyer pays; do NOT send from your own wallet.
    if client.network == "regtest":
        txid = wallet.send_to_address(req.address, req.amount_base_units)
        print("Sent demo payment:", txid)
        wallet.generate_to_address(1, wallet.get_new_address())  # confirm it

    # 9-10) Poll status until terminal (or a few iterations).
    state = None
    for _ in range(10):
        state = check_payment(wallet, req)
        print(f"status={state.status} confirmations={state.observation.confirmations}")
        if state.terminal:
            break
        time.sleep(2)
    print("Final status:", state.status if state else "unknown")


if __name__ == "__main__":
    main()
