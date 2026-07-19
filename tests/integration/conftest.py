# Copyright (c) 2026 The KingPepe developers
# Distributed under the MIT software license, see the accompanying LICENSE file.
"""Pytest fixtures that launch an isolated, self-cleaning regtest node.

Disabled unless KINGPEPE_SDK_RUN_INTEGRATION=1 and a KINGPEPED binary path are
set. Regtest only; a fresh temporary datadir is used and removed afterwards.
"""

from __future__ import annotations

import os
import shutil
import socket
import subprocess
import tempfile
import time

import pytest

from kingpepe_sdk import KingPepeClient

RUN = os.environ.get("KINGPEPE_SDK_RUN_INTEGRATION") == "1"
KINGPEPED = os.environ.get("KINGPEPED")

pytestmark = pytest.mark.skipif(
    not (RUN and KINGPEPED), reason="integration disabled (set KINGPEPE_SDK_RUN_INTEGRATION=1 and KINGPEPED)"
)

_RPC_USER = "itest"
_RPC_PASSWORD = "itest_local_only"


def _free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@pytest.fixture(scope="session")
def regtest_client():
    if not (RUN and KINGPEPED):
        pytest.skip("integration disabled (set KINGPEPE_SDK_RUN_INTEGRATION=1 and KINGPEPED)")
    datadir = tempfile.mkdtemp(prefix="kingpepe-sdk-itest-")
    rpc_port = _free_port()
    p2p_port = _free_port()
    proc = subprocess.Popen(
        [
            KINGPEPED,
            "-regtest",
            f"-datadir={datadir}",
            "-server=1",
            "-rpcbind=127.0.0.1",
            "-rpcallowip=127.0.0.1",
            f"-rpcport={rpc_port}",
            f"-port={p2p_port}",
            f"-rpcuser={_RPC_USER}",
            f"-rpcpassword={_RPC_PASSWORD}",
            "-fallbackfee=0.0002",
            "-txindex=1",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    client = KingPepeClient(
        host="127.0.0.1",
        port=rpc_port,
        network="regtest",
        username=_RPC_USER,
        password=_RPC_PASSWORD,
        timeout=5,
    )
    try:
        deadline = time.time() + 30
        while time.time() < deadline:
            if client.health_check():
                break
            if proc.poll() is not None:
                raise RuntimeError("kingpeped exited during startup")
            time.sleep(0.5)
        else:
            raise RuntimeError("kingpeped did not become ready in time")
        yield client
    finally:
        try:
            client.stop()
        except Exception:
            proc.terminate()
        try:
            proc.wait(timeout=20)
        except subprocess.TimeoutExpired:
            proc.kill()
        shutil.rmtree(datadir, ignore_errors=True)
