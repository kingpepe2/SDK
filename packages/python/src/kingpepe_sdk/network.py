# Copyright (c) 2026 The KingPepe developers
# Distributed under the MIT software license, see the accompanying LICENSE file.
"""KingPepe network identity and constants, verified against KingPepe Core v31.1.

These values are network identity — do not substitute Bitcoin values.
"""

from __future__ import annotations

from typing import Literal

Network = Literal["mainnet", "testnet", "signet", "regtest"]

#: Base units per whole KPEPE (COIN). 1 KPEPE = 100,000,000 base units ("sat").
BASE_UNITS_PER_KPEPE = 100_000_000

#: Number of decimal places a KPEPE amount may have.
KPEPE_DECIMALS = 8

#: Maximum money in base units (MAX_MONEY = 21,000,000 * COIN).
MAX_MONEY_BASE_UNITS = 21_000_000 * BASE_UNITS_PER_KPEPE

#: BIP21-style URI scheme for KingPepe.
URI_SCHEME = "kingpepe"

#: Currency ticker.
CURRENCY_TICKER = "KPEPE"

#: Bech32 human-readable prefixes per network.
BECH32_HRP: dict[Network, str] = {
    "mainnet": "kpepe",
    "testnet": "tkpepe",
    "signet": "tkpepe",
    "regtest": "rkpepe",
}

#: Default JSON-RPC ports per network.
DEFAULT_RPC_PORT: dict[Network, int] = {
    "mainnet": 24027,
    "testnet": 34027,
    "signet": 61883,
    "regtest": 18443,
}

#: Default P2P ports per network (informational).
DEFAULT_P2P_PORT: dict[Network, int] = {
    "mainnet": 24028,
    "testnet": 34028,
    "signet": 61884,
    "regtest": 18444,
}

#: HRPs that belong to Bitcoin and must be rejected by KingPepe-facing tooling.
BITCOIN_HRPS = ("bc", "tb", "bcrt")

#: All known KingPepe HRPs.
KINGPEPE_HRPS = ("kpepe", "tkpepe", "rkpepe")

_HRP_TO_NETWORK = {"kpepe": "mainnet", "tkpepe": "testnet", "rkpepe": "regtest"}


def network_for_hrp(hrp: str) -> Network | None:
    """Map a Bech32 HRP to its KingPepe network, or None if not a KingPepe HRP."""
    return _HRP_TO_NETWORK.get(hrp.lower())  # type: ignore[return-value]
