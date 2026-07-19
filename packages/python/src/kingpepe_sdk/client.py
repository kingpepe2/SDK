# Copyright (c) 2026 The KingPepe developers
# Distributed under the MIT software license, see the accompanying LICENSE file.
"""Synchronous KingPepe Core JSON-RPC client."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

from . import _rpc, _transport
from ._methods import ClientMethods
from .config import RpcConfig, config_from_env
from .errors import KingPepeError


class KingPepeClient(ClientMethods):
    """Synchronous JSON-RPC client for a KingPepe Core node.

    Construct with an :class:`RpcConfig` or keyword options, or use
    :meth:`from_env`. Any RPC is reachable via :meth:`call`; the typed methods
    from :class:`ClientMethods` are thin wrappers over it. Credentials are held
    in memory and never logged.
    """

    def __init__(self, config: RpcConfig | None = None, **options: Any) -> None:
        self.config = config if config is not None else RpcConfig(**options)

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None, **overrides: Any) -> KingPepeClient:
        return cls(config_from_env(env, **overrides))

    def with_wallet(self, wallet: str) -> KingPepeClient:
        """Return a new client scoped to a wallet (``/wallet/<name>``)."""
        return KingPepeClient(RpcConfig(**{**self.config.__dict__, "wallet": wallet}))

    @property
    def network(self) -> str:
        return self.config.network

    def call(self, method: str, params: Sequence[Any] | None = None) -> Any:
        """Low-level JSON-RPC call returning the ``result`` field (or raising a typed error)."""
        body = _rpc.build_request(method, params or [])
        status, text = _transport.sync_request(self.config, _rpc.request_path(self.config), body)
        return _rpc.parse_response(method, status, text)

    # ClientMethods delegates typed wrappers here.
    def _call(self, method: str, params: Sequence[Any]) -> Any:
        return self.call(method, params)

    def health_check(self) -> bool:
        """Return True if the node answers ``uptime``; never raises."""
        try:
            self.uptime()
            return True
        except KingPepeError:
            return False
