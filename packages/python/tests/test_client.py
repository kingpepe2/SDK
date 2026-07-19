import json

import pytest

from kingpepe_sdk import (
    AuthError,
    ConfigError,
    ConnectionError,
    HttpError,
    KingPepeClient,
    ProtocolError,
    RpcError,
    TimeoutError,
    _transport,
)

CREDS = dict(username="u", password="p", network="regtest")


def install_transport(monkeypatch, handler):
    calls = []

    def fake(config, path, body):
        calls.append((config, path, body))
        return handler(config, path, body)

    monkeypatch.setattr(_transport, "sync_request", fake)
    return calls


def ok(result):
    return lambda c, p, b: (200, json.dumps({"result": result, "error": None, "id": 1}))


def test_requires_credentials():
    with pytest.raises(ConfigError):
        KingPepeClient(network="regtest")


def test_success_and_request_shape(monkeypatch):
    calls = install_transport(monkeypatch, ok({"chain": "regtest", "blocks": 5}))
    client = KingPepeClient(**CREDS)
    info = client.get_blockchain_info()
    assert info["chain"] == "regtest"
    config, path, body = calls[0]
    assert path == "/"
    assert config.port == 18443
    parsed = json.loads(body)
    assert parsed["method"] == "getblockchaininfo"
    assert parsed["params"] == []


def test_wallet_scoping(monkeypatch):
    calls = install_transport(monkeypatch, ok({"walletname": "w"}))
    client = KingPepeClient(**CREDS).with_wallet("my wallet")
    client.get_wallet_info()
    assert calls[0][1] == "/wallet/my%20wallet"


def test_money_serialized_as_exact_string(monkeypatch):
    calls = install_transport(monkeypatch, ok("txid"))
    client = KingPepeClient(**CREDS)
    client.send_to_address("rkpepe1qqypqxpq9qcrsszg2pvxq6rs0zqg3yyc5dtjg0t", 150_000_000)
    params = json.loads(calls[0][2])["params"]
    assert params[1] == "1.50000000"


def test_rpc_error(monkeypatch):
    install_transport(
        monkeypatch,
        lambda c, p, b: (500, json.dumps({"result": None, "error": {"code": -18, "message": "no wallet"}, "id": 1})),
    )
    client = KingPepeClient(**CREDS)
    with pytest.raises(RpcError) as exc:
        client.get_wallet_info()
    assert exc.value.code == -18
    assert exc.value.method == "getwalletinfo"


def test_auth_error(monkeypatch):
    install_transport(monkeypatch, lambda c, p, b: (401, ""))
    with pytest.raises(AuthError):
        KingPepeClient(**CREDS).get_block_count()


def test_protocol_error(monkeypatch):
    install_transport(monkeypatch, lambda c, p, b: (200, "<html>nope</html>"))
    with pytest.raises(ProtocolError):
        KingPepeClient(**CREDS).get_block_count()


def test_http_error(monkeypatch):
    install_transport(monkeypatch, lambda c, p, b: (503, "Service Unavailable"))
    with pytest.raises(HttpError):
        KingPepeClient(**CREDS).get_block_count()


def test_transport_errors_propagate(monkeypatch):
    def boom_conn(c, p, b):
        raise ConnectionError("refused")

    monkeypatch.setattr(_transport, "sync_request", boom_conn)
    with pytest.raises(ConnectionError):
        KingPepeClient(**CREDS).get_block_count()


def test_health_check_false_on_error(monkeypatch):
    def boom(c, p, b):
        raise TimeoutError("down")

    monkeypatch.setattr(_transport, "sync_request", boom)
    assert KingPepeClient(**CREDS).health_check() is False


def test_config_repr_hides_password():
    client = KingPepeClient(username="u", password="s3cr3t_pw_value", network="regtest")
    rep = repr(client.config)
    assert "password=***" in rep
    assert "s3cr3t_pw_value" not in rep  # the real password never appears in the repr
    assert client.config.password == "s3cr3t_pw_value"  # but is retained for use
