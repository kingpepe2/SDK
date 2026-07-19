# Copyright (c) 2026 The KingPepe developers
# Distributed under the MIT software license, see the accompanying LICENSE file.
"""Client configuration and environment-variable loading."""

from __future__ import annotations

import os
from collections.abc import Mapping
from dataclasses import dataclass

from .errors import ConfigError
from .network import DEFAULT_RPC_PORT, Network


@dataclass
class TlsOptions:
    """TLS options for HTTPS transport."""

    verify: bool = True
    ca_file: str | None = None
    client_cert: str | None = None
    client_key: str | None = None


@dataclass
class RpcConfig:
    """Fully-resolved RPC configuration. Credentials are never logged."""

    host: str = "127.0.0.1"
    port: int | None = None
    username: str = ""
    password: str = ""
    wallet: str | None = None
    timeout: float = 30.0
    protocol: str = "http"
    network: Network = "mainnet"
    tls: TlsOptions | None = None

    def __post_init__(self) -> None:
        if self.port is None:
            self.port = DEFAULT_RPC_PORT[self.network]
        if not self.username or not self.password:
            raise ConfigError(
                "Missing RPC credentials. Provide username/password (e.g. via "
                "KINGPEPE_RPC_USER / KINGPEPE_RPC_PASSWORD). The SDK never uses "
                "unauthenticated RPC by default."
            )
        if self.timeout <= 0:
            raise ConfigError("timeout must be positive.")
        if self.protocol not in ("http", "https"):
            raise ConfigError("protocol must be 'http' or 'https'.")

    def __repr__(self) -> str:  # never leak the password in logs/reprs
        return (
            f"RpcConfig(host={self.host!r}, port={self.port}, protocol={self.protocol!r}, "
            f"network={self.network!r}, wallet={self.wallet!r}, username={self.username!r}, "
            "password=***)"
        )


def config_from_env(
    env: Mapping[str, str] | None = None,
    **overrides: object,
) -> RpcConfig:
    """Build an :class:`RpcConfig` from ``KINGPEPE_RPC_*`` environment variables.

    Recognized: KINGPEPE_RPC_HOST, KINGPEPE_RPC_PORT, KINGPEPE_RPC_USER,
    KINGPEPE_RPC_PASSWORD, KINGPEPE_RPC_WALLET, KINGPEPE_RPC_TIMEOUT,
    KINGPEPE_RPC_PROTOCOL, KINGPEPE_NETWORK,
    KINGPEPE_RPC_TLS_REJECT_UNAUTHORIZED ("0" disables verification).
    """
    e = os.environ if env is None else env
    network: Network = overrides.get("network") or e.get("KINGPEPE_NETWORK") or "mainnet"  # type: ignore[assignment]
    port_raw = overrides.get("port") or e.get("KINGPEPE_RPC_PORT")
    port = int(str(port_raw)) if port_raw else DEFAULT_RPC_PORT[network]
    timeout_raw = overrides.get("timeout") or e.get("KINGPEPE_RPC_TIMEOUT")
    protocol = overrides.get("protocol") or e.get("KINGPEPE_RPC_PROTOCOL") or "http"

    tls: TlsOptions | None = overrides.get("tls")  # type: ignore[assignment]
    if e.get("KINGPEPE_RPC_TLS_REJECT_UNAUTHORIZED") == "0":
        tls = TlsOptions(verify=False) if tls is None else tls

    return RpcConfig(
        host=overrides.get("host") or e.get("KINGPEPE_RPC_HOST") or "127.0.0.1",  # type: ignore[arg-type]
        port=port,
        username=overrides.get("username") or e.get("KINGPEPE_RPC_USER") or "",  # type: ignore[arg-type]
        password=overrides.get("password") or e.get("KINGPEPE_RPC_PASSWORD") or "",  # type: ignore[arg-type]
        wallet=overrides.get("wallet") or e.get("KINGPEPE_RPC_WALLET") or None,  # type: ignore[arg-type]
        timeout=float(str(timeout_raw)) if timeout_raw else 30.0,
        protocol=str(protocol),
        network=network,
        tls=tls,
    )
