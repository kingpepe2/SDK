import json

import pytest

from kingpepe_sdk import AsyncKingPepeClient, RpcError, _transport

CREDS = dict(username="u", password="p", network="regtest")


def install_async_transport(monkeypatch, handler):
    calls = []

    async def fake(config, path, body):
        calls.append((config, path, body))
        return handler(config, path, body)

    monkeypatch.setattr(_transport, "async_request", fake)
    return calls


async def test_async_success(monkeypatch):
    calls = install_async_transport(
        monkeypatch, lambda c, p, b: (200, json.dumps({"result": 223924, "error": None, "id": 1}))
    )
    client = AsyncKingPepeClient(**CREDS)
    assert await client.get_block_count() == 223924
    assert json.loads(calls[0][2])["method"] == "getblockcount"


async def test_async_rpc_error(monkeypatch):
    install_async_transport(
        monkeypatch,
        lambda c, p, b: (500, json.dumps({"result": None, "error": {"code": -8, "message": "bad"}, "id": 1})),
    )
    client = AsyncKingPepeClient(**CREDS)
    with pytest.raises(RpcError):
        await client.get_block_hash(999_999_999)


async def test_async_health_check(monkeypatch):
    install_async_transport(monkeypatch, lambda c, p, b: (200, json.dumps({"result": 1, "error": None, "id": 1})))
    client = AsyncKingPepeClient(**CREDS)
    assert await client.health_check() is True
