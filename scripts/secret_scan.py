#!/usr/bin/env python3
# Copyright (c) 2026 The KingPepe developers
# Distributed under the MIT software license, see the accompanying LICENSE file.
"""Fail if any tracked file appears to contain a committed secret.

Scans git-tracked files for high-signal secret patterns (private keys, provider
tokens, real-looking RPC passwords). Placeholder/example/test values are allowed.
Prints the exact file:line for each finding.
"""

from __future__ import annotations

import re
import subprocess
import sys

# High-signal secret patterns.
PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("private key block", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    ("GitHub token", re.compile(r"\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b")),
    ("GitHub PAT", re.compile(r"\bgithub_pat_[A-Za-z0-9_]{20,}\b")),
    ("AWS access key id", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("Slack token", re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}\b")),
    # A concrete rpcpassword value (>= 16 chars) committed in a config file.
    ("rpc password value", re.compile(r"(?i)rpcpassword\s*=\s*\S{16,}")),
    ("bip39-like seed hint", re.compile(r"(?i)\b(mnemonic|seed[_ ]?phrase)\b\s*[:=]\s*['\"][a-z ]{40,}['\"]")),
]

# Values/paths that are legitimate examples or test fixtures.
ALLOW_SUBSTRINGS = ("change_me", "s3cr3t_pw_value", "your_", "example", "<", "REPLACE")
ALLOW_PATH_SUFFIXES = (".env.example",)


def tracked_files() -> list[str]:
    out = subprocess.run(["git", "ls-files"], stdout=subprocess.PIPE, text=True, check=True).stdout
    return [f for f in out.splitlines() if f]


def main() -> int:
    findings: list[str] = []
    for path in tracked_files():
        if path.endswith(ALLOW_PATH_SUFFIXES):
            continue
        try:
            with open(path, encoding="utf-8") as fh:
                lines = fh.readlines()
        except (UnicodeDecodeError, FileNotFoundError, IsADirectoryError):
            continue
        for lineno, line in enumerate(lines, start=1):
            if any(allow in line for allow in ALLOW_SUBSTRINGS):
                continue
            for label, pat in PATTERNS:
                if pat.search(line):
                    findings.append(f"{path}:{lineno}: possible {label}")

    if findings:
        print("Potential committed secrets found:\n")
        print("\n".join(findings))
        print("\nRemove the secret, rotate it, and use environment variables instead.")
        return 1
    print("Secret scan: no committed secrets found.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
