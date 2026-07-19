"""Scenarios 4-7: create/load a descriptor wallet, generate an address,
check balance, and list unspent outputs. Regtest recommended."""

from __future__ import annotations

from kingpepe_sdk import KingPepeClient, format_kpepe, rpc_amount_to_base_units

WALLET = "example-shop"


def main() -> None:
    client = KingPepeClient.from_env()

    if WALLET not in client.list_wallets():
        try:
            client.create_wallet(WALLET, descriptors=True)
        except Exception:
            client.load_wallet(WALLET)
    wallet = client.with_wallet(WALLET)

    address = wallet.get_new_address("example-label")
    print("New receiving address:", address)

    balances = wallet.get_balances()
    trusted = rpc_amount_to_base_units(balances["mine"]["trusted"])
    print("Trusted balance:", format_kpepe(trusted), "KPEPE")

    unspent = wallet.list_unspent(0)
    print(f"Unspent outputs: {len(unspent)}")
    for u in unspent[:5]:
        amt = format_kpepe(rpc_amount_to_base_units(u["amount"]))
        print(f"  {u['txid']}:{u['vout']}  {amt} KPEPE  conf={u['confirmations']}")


if __name__ == "__main__":
    main()
