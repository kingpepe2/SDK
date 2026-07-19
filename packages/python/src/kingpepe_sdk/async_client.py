# Copyright (c) 2026 The KingPepe developers
# Distributed under the MIT software license, see the accompanying LICENSE file.
"""Asynchronous KingPepe Core JSON-RPC client (asyncio)."""

from __future__ import annotations

from collections.abc import Awaitable, Mapping, Sequence
from typing import Any

from . import _rpc, _transport
from ._methods import ClientMethods
from .config import RpcConfig, config_from_env
from .errors import KingPepeError


class AsyncKingPepeClient(ClientMethods):
    """Asyncio JSON-RPC client for a KingPepe Core node.

    Mirrors :class:`KingPepeClient` but every RPC returns a coroutine — ``await``
    the typed methods and :meth:`call`. Credentials are never logged.
    """

    def __init__(self, config: RpcConfig | None = None, **options: Any) -> None:
        self.config = config if config is not None else RpcConfig(**options)

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None, **overrides: Any) -> AsyncKingPepeClient:
        return cls(config_from_env(env, **overrides))

    def with_wallet(self, wallet: str) -> AsyncKingPepeClient:
        return AsyncKingPepeClient(RpcConfig(**{**self.config.__dict__, "wallet": wallet}))

    @property
    def network(self) -> str:
        return self.config.network

    async def call(self, method: str, params: Sequence[Any] | None = None) -> Any:
        """Low-level async JSON-RPC call returning the ``result`` (or raising a typed error)."""
        body = _rpc.build_request(method, params or [])
        status, text = await _transport.async_request(self.config, _rpc.request_path(self.config), body)
        return _rpc.parse_response(method, status, text)

    # ClientMethods calls self._call(...) and returns the value. Here _call returns
    # the coroutine from `call`, so the typed wrappers become awaitables.
    def _call(self, method: str, params: Sequence[Any]) -> Awaitable[Any]:
        return self.call(method, params)

    async def health_check(self) -> bool:
        """Return True if the node answers ``uptime``; never raises."""
        try:
            await self.uptime()
            return True
        except KingPepeError:
            return False
