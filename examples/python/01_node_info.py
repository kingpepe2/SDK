"""Scenarios 1-3: connect to a local node; show blockchain and network info.

Run: python examples/python/01_node_info.py   (with KINGPEPE_RPC_* env vars)
"""

from __future__ import annotations

import sys

from kingpepe_sdk import KingPepeClient


def main() -> int:
    client = KingPepeClient.from_env()
    if not client.health_check():
        print("KingPepe node is not reachable — check KINGPEPE_RPC_* env vars.", file=sys.stderr)
        return 1

    chain = client.get_blockchain_info()
    print("Blockchain:")
    print(f"  chain={chain['chain']} height={chain['blocks']} headers={chain['headers']}")
    print(f"  bestblockhash={chain['bestblockhash']}")

    net = client.get_network_info()
    print("Network:")
    print(f"  subversion={net['subversion']} protocol={net['protocolversion']}")
    print(f"  connections={net['connections']} active={net['networkactive']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
