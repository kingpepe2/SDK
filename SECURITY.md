# Security Policy

The KingPepe SDK talks to a KingPepe Core node's JSON-RPC interface, which can
move real funds. Treat it as security-sensitive software.

## Secure defaults and requirements

- **Bind RPC privately.** Keep the node's RPC on `127.0.0.1` or a private
  network (`rpcbind=127.0.0.1`, `rpcallowip=127.0.0.1`). Never expose wallet RPC
  directly to the public internet.
- **Use a firewall.** Restrict the RPC port to trusted hosts only.
- **Use TLS for remote access.** Put a secure reverse proxy (or an SSH tunnel /
  VPN) in front of the node for any non-local connection, and configure the SDK
  with `https` + certificate verification.
- **Authenticate with `rpcauth`.** Prefer per-service `rpcauth` credentials over
  a shared `rpcuser`/`rpcpassword`. Give each service the least privilege it
  needs and use separate wallets where possible (least-privilege wallet
  separation).
- **Never put keys or RPC credentials in client code.** Browsers, mobile apps,
  and game clients must never hold private keys, seeds, RPC passwords, or tokens,
  and must never connect directly to the wallet RPC. All wallet access stays on a
  trusted backend.
- **Protect backups.** `backupwallet` output and any seed material must be
  encrypted at rest and access-controlled.

## Handling credentials

- Configure the SDK from **environment variables**; do not hardcode secrets.
- The SDK **never logs** credentials. The Python config's `repr` masks the
  password; error messages are transport-level and do not include auth headers.
- Sanitize error messages before surfacing them to end users.

## Payments and withdrawals

- **Validate every amount and destination.** Use the SDK's amount validators and
  `assert_kingpepe_address` / `validateaddress` before sending.
- **Use idempotency keys.** Every payment and withdrawal must be keyed so retries
  cannot double-spend or double-credit.
- **Require confirmations.** Do not credit funds until the configured
  confirmation depth is reached; blockchain confirmations are not instant.
- **Protect webhooks.** Sign webhook payloads (e.g. HMAC) and verify signatures;
  include replay protection (timestamps / nonces) on the receiving side.

## Reporting a vulnerability (responsible disclosure)

Please report suspected vulnerabilities **privately**. Do not open a public issue
for security problems.

1. Use GitHub's private "Report a vulnerability" (Security Advisories) on the
   repository, **or**
2. Contact the KingPepe maintainers through the channel listed on the KingPepe
   Core repository: https://github.com/kingpepe2/king-pepe-source-code

Include a description, affected versions, and reproduction steps. Please allow a
reasonable time for a fix before any public disclosure. Do not include real
secrets in your report.

See [`docs/THREAT_MODEL.md`](./docs/THREAT_MODEL.md) for the threat model and
[`docs/NODE_SETUP.md`](./docs/NODE_SETUP.md) for a secure configuration guide.
