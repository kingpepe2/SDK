# Threat Model

This document describes the assets, trust boundaries, threats, and mitigations
for applications that integrate KingPepe Core through this SDK.

## Assets

- Private keys and wallet seeds (held by the node, never by the SDK).
- RPC credentials (`rpcauth` / `rpcuser`+`rpcpassword`).
- Funds controlled by the wallet.
- The integrity of the merchant/game database and its mapping between on-chain
  payments and off-chain balances.

## Trust boundaries

```
[ browser / mobile / game client ]   <-- UNTRUSTED
             |  (HTTPS app API; no keys, no RPC)
             v
[ your backend server ]               <-- TRUSTED (holds RPC creds)
             |  (JSON-RPC over localhost / private net / TLS)
             v
[ kingpeped node + wallet ]           <-- TRUSTED (holds keys)
```

The SDK runs on the **backend** side. Clients never cross into the trusted zone.

## Threats and mitigations

| Threat | Mitigation |
|--------|-----------|
| RPC exposed to the internet | Bind to localhost/private net; firewall; TLS reverse proxy; `rpcauth` |
| Credential leakage via logs | SDK never logs credentials; config repr masks password; sanitize errors |
| Credentials in client code | All wallet access on the backend; clients use your app API only |
| Float rounding of amounts | Integer base units end-to-end; amounts sent as exact decimal strings |
| Sending to a Bitcoin/typo address | `assert_kingpepe_address` + node `validateaddress`; reject Bitcoin HRPs/URIs |
| Double credit on ret/replay | Idempotency keys on payments/withdrawals; unique address per payment |
| Crediting unconfirmed funds | Require configured confirmation depth before crediting |
| Underpayment / overpayment | Explicit `underpaid`/`overpaid` states; reconcile before fulfilment |
| Webhook forgery / replay | Sign webhooks (HMAC), verify signatures, add timestamp/nonce replay checks |
| Man-in-the-middle on remote RPC | HTTPS with certificate verification; do not disable `rejectUnauthorized` |
| Backup/seed theft | Encrypt backups at rest; access control; never commit seeds |

## Out of scope

- Consensus-level security of KingPepe Core itself (see the Core repository).
- Host and OS hardening beyond the guidance in `docs/NODE_SETUP.md`.
- Key management hardware / HSM integration (application-specific).
