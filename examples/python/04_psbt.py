"""Scenario 12: create and process a PSBT (Partially Signed Bitcoin Transaction —
the standard cross-wallet format) with a funded wallet."""

from __future__ import annotations

from kingpepe_sdk import KingPepeClient, format_kpepe, parse_kpepe


def main() -> None:
    client = KingPepeClient.from_env()
    wallet = client.with_wallet("example-shop")

    destination = wallet.get_new_address("psbt-dest")
    amount = parse_kpepe("0.5")

    funded = wallet.wallet_create_funded_psbt(
        [], [{destination: format_kpepe(amount)}], 0, {"fee_rate": 2}
    )
    print("Funded PSBT fee:", funded["fee"])

    analysis = wallet.analyze_psbt(funded["psbt"])
    print("Analysis next:", analysis.get("next"))

    processed = wallet.wallet_process_psbt(funded["psbt"])
    final = wallet.finalize_psbt(processed["psbt"])
    print("Finalized complete:", final["complete"])

    # To broadcast: if final.get("hex"): wallet.send_raw_transaction(final["hex"])
    # Left commented so the example does not move funds unless you opt in.


if __name__ == "__main__":
    main()
