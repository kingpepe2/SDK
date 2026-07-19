# Copyright (c) 2026 The KingPepe developers
# Distributed under the MIT software license, see the accompanying LICENSE file.
"""Money handling for KPEPE.

KPEPE amounts are ALWAYS represented internally as integer base units. Binary
floating point (``float``) is never used for value-carrying amounts. Accept a
validated decimal string or an int of base units; never a float.
"""

from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation

from .errors import ValidationError
from .network import BASE_UNITS_PER_KPEPE, KPEPE_DECIMALS, MAX_MONEY_BASE_UNITS

_AMOUNT_RE = re.compile(r"^-?\d+(\.\d+)?$")


def parse_kpepe(amount: str) -> int:
    """Parse a decimal KPEPE string (e.g. ``"1.23456789"``) into integer base units."""
    if not isinstance(amount, str):
        raise ValidationError("Amount must be a decimal string, not a float (avoid precision loss).")
    text = amount.strip()
    if not _AMOUNT_RE.match(text):
        raise ValidationError(f"Invalid KPEPE amount: {amount!r}")
    negative = text.startswith("-")
    unsigned = text[1:] if negative else text
    whole, _, frac = unsigned.partition(".")
    if len(frac) > KPEPE_DECIMALS:
        raise ValidationError(f"KPEPE supports at most {KPEPE_DECIMALS} decimals; got {len(frac)}.")
    frac_padded = frac.ljust(KPEPE_DECIMALS, "0")
    base = int(whole) * BASE_UNITS_PER_KPEPE + (int(frac_padded) if frac_padded else 0)
    value = -base if negative else base
    _assert_money_range(value)
    return value


def format_kpepe(base_units: int) -> str:
    """Format integer base units as a fixed 8-decimal KPEPE string."""
    if not isinstance(base_units, int) or isinstance(base_units, bool):
        raise ValidationError("Base units must be an int.")
    negative = base_units < 0
    abs_units = -base_units if negative else base_units
    whole, frac = divmod(abs_units, BASE_UNITS_PER_KPEPE)
    return f"{'-' if negative else ''}{whole}.{frac:0{KPEPE_DECIMALS}d}"


#: Aliases matching the documented conversion helpers.
kpepe_to_base_units = parse_kpepe
base_units_to_kpepe = format_kpepe


def validate_amount(amount: str | int) -> int:
    """Validate a decimal string or base-unit int is a non-negative, in-range value."""
    base_units = amount if isinstance(amount, int) and not isinstance(amount, bool) else parse_kpepe(str(amount))
    if base_units < 0:
        raise ValidationError("Amount must not be negative.")
    _assert_money_range(base_units)
    return base_units


def rpc_amount_to_base_units(amount: float | int | str) -> int:
    """Convert a KPEPE amount returned by Core RPC into exact integer base units.

    Core reports amounts as JSON numbers with up to 8 decimals; using Decimal on
    the repr keeps the conversion exact within the money range.
    """
    try:
        dec = Decimal(str(amount))
    except InvalidOperation as exc:  # pragma: no cover - defensive
        raise ValidationError(f"Invalid RPC amount: {amount!r}") from exc
    scaled = (dec * BASE_UNITS_PER_KPEPE).quantize(Decimal(1))
    base_units = int(scaled)
    _assert_money_range(base_units)
    return base_units


def _assert_money_range(base_units: int) -> None:
    if abs(base_units) > MAX_MONEY_BASE_UNITS:
        raise ValidationError("Amount out of range (exceeds MAX_MONEY).")
