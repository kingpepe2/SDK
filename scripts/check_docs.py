#!/usr/bin/env python3
# Copyright (c) 2026 The KingPepe developers
# Distributed under the MIT software license, see the accompanying LICENSE file.
"""Fail if any required documentation file is missing or empty.

Also flags user-visible Bitcoin product branding in SDK docs (allowing
legitimate upstream/BIP/license references).
"""

from __future__ import annotations

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

REQUIRED = [
    "README.md",
    "LICENSE",
    "SECURITY.md",
    "CONTRIBUTING.md",
    "CHANGELOG.md",
    "docs/GETTING_STARTED.md",
    "docs/API_REFERENCE.md",
    "docs/PAYMENTS.md",
    "docs/GAMES.md",
    "docs/NODE_SETUP.md",
    "docs/REGTEST_GUIDE.md",
    "docs/MIGRATION.md",
    "docs/THREAT_MODEL.md",
]

# Lines with these are legitimate references and are not branding leaks.
ALLOW = re.compile(
    r"The Bitcoin Core developers|github\.com/bitcoin|bitcoincore\.org|BIP\d|"
    r"Partially Signed Bitcoin Transaction|derived from Bitcoin|Bitcoin-derived|"
    r"upstream|MIT",
)
PROHIBITED = re.compile(r"\bbitcoind\b|\bbitcoin-cli\b|bitcoin:[a-z0-9]")


def main() -> int:
    errors: list[str] = []
    for rel in REQUIRED:
        path = ROOT / rel
        if not path.exists():
            errors.append(f"missing required doc: {rel}")
        elif path.stat().st_size == 0:
            errors.append(f"required doc is empty: {rel}")

    # Branding check over markdown docs.
    for md in ROOT.rglob("*.md"):
        if "node_modules" in md.parts or ".git" in md.parts:
            continue
        for lineno, line in enumerate(md.read_text(encoding="utf-8").splitlines(), start=1):
            if ALLOW.search(line):
                continue
            if PROHIBITED.search(line):
                errors.append(f"{md.relative_to(ROOT)}:{lineno}: user-visible Bitcoin branding")

    if errors:
        print("Documentation checks failed:\n")
        print("\n".join(errors))
        return 1
    print(f"Documentation checks passed ({len(REQUIRED)} required docs present).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
