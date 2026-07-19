# Copyright (c) 2026 The KingPepe developers
# Distributed under the MIT software license, see the accompanying LICENSE file.
"""Low-level HTTP/HTTPS transports (sync via http.client, async via asyncio).

Dependency-light on purpose: uses only the Python standard library. Credentials
are placed in the Authorization header and never logged.
"""

from __future__ import annotations

import asyncio
import base64
import http.client
import ssl

from .config import RpcConfig, TlsOptions
from .errors import ConnectionError as KpConnectionError
from .errors import TimeoutError as KpTimeoutError


def _auth_header(config: RpcConfig) -> str:
    raw = f"{config.username}:{config.password}".encode()
    return "Basic " + base64.b64encode(raw).decode("ascii")


def build_ssl_context(tls: TlsOptions | None) -> ssl.SSLContext:
    ctx = ssl.create_default_context()
    if tls is not None:
        if tls.ca_file:
            ctx.load_verify_locations(cafile=tls.ca_file)
        if tls.client_cert:
            ctx.load_cert_chain(certfile=tls.client_cert, keyfile=tls.client_key)
        if not tls.verify:
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
    return ctx


def _headers(config: RpcConfig, body: str) -> dict[str, str]:
    return {
        "Content-Type": "application/json",
        "Content-Length": str(len(body.encode())),
        "Authorization": _auth_header(config),
        "Connection": "close",
    }


def sync_request(config: RpcConfig, path: str, body: str) -> tuple[int, str]:
    """Perform a synchronous POST and return ``(status_code, body_text)``."""
    conn: http.client.HTTPConnection
    if config.protocol == "https":
        conn = http.client.HTTPSConnection(
            config.host, config.port, timeout=config.timeout, context=build_ssl_context(config.tls)
        )
    else:
        conn = http.client.HTTPConnection(config.host, config.port, timeout=config.timeout)
    try:
        conn.request("POST", path, body=body, headers=_headers(config, body))
        response = conn.getresponse()
        text = response.read().decode("utf-8", errors="replace")
        return response.status, text
    except TimeoutError:
        raise KpTimeoutError(f"Request timed out after {config.timeout}s.") from None
    except OSError as exc:
        raise KpConnectionError(f"RPC transport error: {exc}") from exc
    finally:
        conn.close()


async def async_request(config: RpcConfig, path: str, body: str) -> tuple[int, str]:
    """Perform an asynchronous POST and return ``(status_code, body_text)``."""
    ssl_ctx = build_ssl_context(config.tls) if config.protocol == "https" else None
    try:
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(config.host, config.port, ssl=ssl_ctx), timeout=config.timeout
        )
    except asyncio.TimeoutError:
        raise KpTimeoutError(f"Connection timed out after {config.timeout}s.") from None
    except OSError as exc:
        raise KpConnectionError(f"RPC transport error: {exc}") from exc

    try:
        header_block = "".join(f"{k}: {v}\r\n" for k, v in _headers(config, body).items())
        request = f"POST {path} HTTP/1.1\r\nHost: {config.host}:{config.port}\r\n{header_block}\r\n{body}"
        writer.write(request.encode())
        await asyncio.wait_for(writer.drain(), timeout=config.timeout)
        raw = await asyncio.wait_for(reader.read(), timeout=config.timeout)
    except asyncio.TimeoutError:
        raise KpTimeoutError(f"Request timed out after {config.timeout}s.") from None
    except OSError as exc:
        raise KpConnectionError(f"RPC transport error: {exc}") from exc
    finally:
        writer.close()
        try:
            await writer.wait_closed()
        except OSError:
            pass

    return _parse_http_response(raw)


def _parse_http_response(raw: bytes) -> tuple[int, str]:
    sep = raw.find(b"\r\n\r\n")
    if sep == -1:
        raise KpConnectionError("Malformed HTTP response (no header terminator).")
    head = raw[:sep].decode("iso-8859-1")
    body_bytes = raw[sep + 4 :]
    status_line = head.split("\r\n", 1)[0]
    parts = status_line.split(" ", 2)
    try:
        status = int(parts[1])
    except (IndexError, ValueError):
        raise KpConnectionError(f"Malformed HTTP status line: {status_line!r}") from None
    return status, body_bytes.decode("utf-8", errors="replace")
