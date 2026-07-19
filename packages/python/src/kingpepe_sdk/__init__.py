# Copyright (c) 2026 The KingPepe developers
# Distributed under the MIT software license, see the accompanying LICENSE file.
"""kingpepe-sdk — official Python SDK for KingPepe Core.

Example::

    from kingpepe_sdk import KingPepeClient
    client = KingPepeClient.from_env()
    info = client.get_blockchain_info()
"""

from __future__ import annotations

from .address import (
    assert_kingpepe_address,
    decode_bech32,
    get_network_for_address,
    is_bitcoin_address,
    is_valid_kingpepe_address_format,
)
from .async_client import AsyncKingPepeClient
from .client import KingPepeClient
from .config import RpcConfig, TlsOptions, config_from_env
from .errors import (
    AuthError,
    ConfigError,
    ConnectionError,
    HttpError,
    KingPepeError,
    ProtocolError,
    RpcError,
    TimeoutError,
    ValidationError,
)
from .money import (
    base_units_to_kpepe,
    format_kpepe,
    kpepe_to_base_units,
    parse_kpepe,
    rpc_amount_to_base_units,
    validate_amount,
)
from .network import (
    BASE_UNITS_PER_KPEPE,
    BECH32_HRP,
    BITCOIN_HRPS,
    CURRENCY_TICKER,
    DEFAULT_P2P_PORT,
    DEFAULT_RPC_PORT,
    KINGPEPE_HRPS,
    KPEPE_DECIMALS,
    MAX_MONEY_BASE_UNITS,
    URI_SCHEME,
    network_for_hrp,
)
from .payments import (
    PaymentObservation,
    PaymentRequest,
    PaymentState,
    check_payment,
    create_payment_request,
    evaluate_payment,
    observe_payment,
    payment_uri,
    to_payment_event,
)
from .uri import KingPepeUri, build_uri, parse_uri

__version__ = "0.1.0"

__all__ = [
    "AsyncKingPepeClient",
    "KingPepeClient",
    "RpcConfig",
    "TlsOptions",
    "config_from_env",
    "AuthError",
    "ConfigError",
    "ConnectionError",
    "HttpError",
    "KingPepeError",
    "ProtocolError",
    "RpcError",
    "TimeoutError",
    "ValidationError",
    "base_units_to_kpepe",
    "format_kpepe",
    "kpepe_to_base_units",
    "parse_kpepe",
    "rpc_amount_to_base_units",
    "validate_amount",
    "assert_kingpepe_address",
    "decode_bech32",
    "get_network_for_address",
    "is_bitcoin_address",
    "is_valid_kingpepe_address_format",
    "KingPepeUri",
    "build_uri",
    "parse_uri",
    "BASE_UNITS_PER_KPEPE",
    "BECH32_HRP",
    "BITCOIN_HRPS",
    "CURRENCY_TICKER",
    "DEFAULT_P2P_PORT",
    "DEFAULT_RPC_PORT",
    "KINGPEPE_HRPS",
    "KPEPE_DECIMALS",
    "MAX_MONEY_BASE_UNITS",
    "URI_SCHEME",
    "network_for_hrp",
    "PaymentObservation",
    "PaymentRequest",
    "PaymentState",
    "check_payment",
    "create_payment_request",
    "evaluate_payment",
    "observe_payment",
    "payment_uri",
    "to_payment_event",
    "__version__",
]
