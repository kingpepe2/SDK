# Contributing

Thanks for helping improve the KingPepe SDK.

## Ground rules

- Keep changes focused; write clear commit messages.
- Do not commit secrets. Credentials come from environment variables; the CI
  secret scan (`scripts/secret_scan.py`) must pass.
- Product-facing content uses KingPepe naming (KingPepe Core, KPEPE,
  `kingpepe:`). Keep legitimate upstream/BIP/license references.
- Only add RPC wrappers for methods that exist in the targeted KingPepe Core
  version. Do not invent methods.
- Never use binary floating point for KPEPE amounts — use integer base units.

## Development

TypeScript / JavaScript (`packages/javascript`):

```bash
npm install
npm run lint && npm run typecheck && npm test && npm run build
```

Python (`packages/python`):

```bash
python -m pip install -e ".[dev]"
ruff check . && mypy && pytest
```

## Tests

- Unit tests must not require a node (mock the transport).
- Integration tests are regtest-only, isolated, and disabled by default (see
  [`tests/README.md`](./tests/README.md)). They must never touch a real mainnet
  wallet or datadir.

## Pull requests

- Ensure SDK CI is green (both language jobs, secret scan, docs check).
- Update docs and `CHANGELOG.md` for user-facing changes.
- Do not publish npm/PyPI packages or create releases as part of a PR.
