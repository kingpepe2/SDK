# Copyright (c) 2026 The KingPepe developers
# Distributed under the MIT software license, see the accompanying LICENSE file.
"""Address / Bech32 helpers.

These perform BASIC, self-contained format validation (Bech32/Bech32m structure
+ checksum + KingPepe HRP). They are NOT a substitute for consensus-critical
validation. For authoritative validation, ask a KingPepe Core node via the
``validateaddress`` RPC (see :meth:`KingPepeClient.validate_address`).
"""

from __future__ import annotations

from .errors import ValidationError
from .network import BITCOIN_HRPS, Network, network_for_hrp

_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"
_GENERATOR = (0x3B6A57B2, 0x26508E6D, 0x1EA119FA, 0x3D4233DD, 0x2A1462B3)


def _polymod(values: list[int]) -> int:
    chk = 1
    for v in values:
        top = chk >> 25
        chk = ((chk & 0x1FFFFFF) << 5) ^ v
        for i in range(5):
            if (top >> i) & 1:
                chk ^= _GENERATOR[i]
    return chk


def _hrp_expand(hrp: str) -> list[int]:
    return [ord(c) >> 5 for c in hrp] + [0] + [ord(c) & 31 for c in hrp]


def decode_bech32(value: str) -> tuple[str, str] | None:
    """Decode a Bech32/Bech32m string, verifying the checksum.

    Returns ``(hrp, encoding)`` where encoding is ``"bech32"`` or ``"bech32m"``,
    or ``None`` on failure.
    """
    if value != value.lower() and value != value.upper():
        return None
    s = value.lower()
    pos = s.rfind("1")
    if pos < 1 or pos + 7 > len(s) or len(s) > 90:
        return None
    hrp = s[:pos]
    data = []
    for c in s[pos + 1 :]:
        d = _CHARSET.find(c)
        if d == -1:
            return None
        data.append(d)
    chk = _polymod(_hrp_expand(hrp) + data)
    if chk == 1:
        return hrp, "bech32"
    if chk == 0x2BC830A3:
        return hrp, "bech32m"
    return None


def get_network_for_address(address: str) -> Network | None:
    """Return the KingPepe network a Bech32 address belongs to, or None."""
    decoded = decode_bech32(address)
    if not decoded:
        return None
    return network_for_hrp(decoded[0])


def is_bitcoin_address(address: str) -> bool:
    """True if the string is a Bitcoin Bech32 address (bc/tb/bcrt)."""
    decoded = decode_bech32(address)
    return bool(decoded and decoded[0] in BITCOIN_HRPS)


def is_valid_kingpepe_address_format(address: str, network: Network | None = None) -> bool:
    """Basic format validation for a KingPepe Bech32 address; rejects Bitcoin HRPs."""
    decoded = decode_bech32(address)
    if not decoded:
        return False
    addr_network = network_for_hrp(decoded[0])
    if addr_network is None:
        return False
    if network is not None and addr_network != network:
        return False
    return True


def assert_kingpepe_address(address: str, network: Network | None = None) -> None:
    """Assert a KingPepe address format, raising :class:`ValidationError` otherwise."""
    if is_bitcoin_address(address):
        raise ValidationError("Refusing a Bitcoin address in a KingPepe-facing operation.")
    if not is_valid_kingpepe_address_format(address, network):
        raise ValidationError(
            f"Not a valid KingPepe {network or ''} address (basic format check). "
            "Use the node's validateaddress RPC for authoritative validation."
        )
