# Copyright (c) 2026 The KingPepe developers
# Distributed under the MIT software license, see the accompanying LICENSE file.
"""Build and parse ``kingpepe:`` payment URIs (BIP21-style)."""

from __future__ import annotations

from dataclasses import dataclass, field
from urllib.parse import parse_qsl, quote_plus, urlencode

from .address import assert_kingpepe_address
from .errors import ValidationError
from .money import format_kpepe, parse_kpepe
from .network import URI_SCHEME


@dataclass
class KingPepeUri:
    """Fields of a parsed or to-be-built ``kingpepe:`` URI."""

    address: str
    amount_base_units: int | None = None
    label: str | None = None
    message: str | None = None
    params: dict[str, str] = field(default_factory=dict)


def build_uri(uri: KingPepeUri) -> str:
    """Build a ``kingpepe:`` payment URI from integer base units (lossless)."""
    assert_kingpepe_address(uri.address)
    query: list[tuple[str, str]] = []
    if uri.amount_base_units is not None:
        if uri.amount_base_units < 0:
            raise ValidationError("URI amount must not be negative.")
        query.append(("amount", _trim_amount(format_kpepe(uri.amount_base_units))))
    if uri.label is not None:
        query.append(("label", uri.label))
    if uri.message is not None:
        query.append(("message", uri.message))
    for key, value in uri.params.items():
        if key not in {"amount", "label", "message"}:
            query.append((key, value))
    encoded = urlencode(query, quote_via=quote_plus)
    return f"{URI_SCHEME}:{uri.address}" + (f"?{encoded}" if encoded else "")


def parse_uri(text: str) -> KingPepeUri:
    """Parse a ``kingpepe:`` URI; rejects a ``bitcoin:`` scheme or non-KingPepe address."""
    if ":" not in text:
        raise ValidationError("Not a URI.")
    scheme, _, rest = text.partition(":")
    scheme = scheme.lower()
    if scheme == "bitcoin":
        raise ValidationError("Refusing a bitcoin: URI in a KingPepe-facing parser.")
    if scheme != URI_SCHEME:
        raise ValidationError(f"Expected a {URI_SCHEME}: URI, got {scheme}:")
    address, _, query = rest.partition("?")
    if not address:
        raise ValidationError("URI is missing an address.")
    assert_kingpepe_address(address)

    result = KingPepeUri(address=address)
    if query:
        for key, value in parse_qsl(query, keep_blank_values=True):
            if key == "amount":
                result.amount_base_units = parse_kpepe(value)
            elif key == "label":
                result.label = value
            elif key == "message":
                result.message = value
            else:
                result.params[key] = value
    return result


def _trim_amount(fixed: str) -> str:
    if "." not in fixed:
        return fixed
    return fixed.rstrip("0").rstrip(".")
