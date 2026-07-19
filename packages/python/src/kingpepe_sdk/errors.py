# Copyright (c) 2026 The KingPepe developers
# Distributed under the MIT software license, see the accompanying LICENSE file.
"""Structured exception hierarchy for the KingPepe SDK."""

from __future__ import annotations

from typing import Any


class KingPepeError(Exception):
    """Base class for all KingPepe SDK errors."""


class ValidationError(KingPepeError):
    """Invalid input (amounts, addresses, URIs) or invalid SDK usage."""


class ConfigError(KingPepeError):
    """Configuration is missing or invalid (e.g. no credentials)."""


class ConnectionError(KingPepeError):
    """The network request failed (DNS, refused, TLS, socket error)."""


class TimeoutError(KingPepeError):
    """The request exceeded the configured timeout."""


class HttpError(KingPepeError):
    """HTTP-level failure that is not a structured JSON-RPC error."""

    def __init__(self, message: str, status_code: int) -> None:
        super().__init__(message)
        self.status_code = status_code


class AuthError(HttpError):
    """Authentication failed (HTTP 401/403)."""


class RpcError(KingPepeError):
    """A structured JSON-RPC error returned by the node."""

    def __init__(self, message: str, code: int, method: str, data: Any | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.method = method
        self.data = data


class ProtocolError(KingPepeError):
    """The response body was not valid JSON-RPC."""
