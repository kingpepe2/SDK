# Copyright (c) 2026 The KingPepe developers
# Distributed under the MIT software license, see the accompanying LICENSE file.
"""Shared JSON-RPC framing and response parsing for the sync/async clients."""

from __future__ import annotations

import itertools
import json
from collections.abc import Sequence
from typing import Any

from .config import RpcConfig
from .errors import AuthError, HttpError, ProtocolError, RpcError

_ID_COUNTER = itertools.count(1)


def build_request(method: str, params: Sequence[Any]) -> str:
    return json.dumps({"jsonrpc": "1.0", "id": next(_ID_COUNTER), "method": method, "params": list(params)})


def request_path(config: RpcConfig) -> str:
    if config.wallet:
        from urllib.parse import quote

        return f"/wallet/{quote(config.wallet, safe='')}"
    return "/"


def parse_response(method: str, status: int, body_text: str) -> Any:
    """Return the JSON-RPC ``result`` or raise a typed error."""
    if status in (401, 403):
        raise AuthError("RPC authentication failed. Check username/password (rpcauth).", status)
    try:
        payload = json.loads(body_text)
    except json.JSONDecodeError:
        if not 200 <= status < 300:
            raise HttpError(f"RPC HTTP {status} with a non-JSON body.", status) from None
        raise ProtocolError("RPC response was not valid JSON.") from None
    if isinstance(payload, dict) and payload.get("error"):
        err = payload["error"]
        raise RpcError(err.get("message", "RPC error"), err.get("code", 0), method, err.get("data"))
    if not 200 <= status < 300:
        raise HttpError(f"RPC HTTP {status}.", status)
    return payload.get("result") if isinstance(payload, dict) else payload
