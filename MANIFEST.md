# Auth Manifest (`auth.juvantia.org`)

**Service**: `auth`  
**Domain**: `https://auth.juvantia.org`  
**Core Tech**: Next.js App Router, SuperTokens, PostgreSQL, Zod, viem.

## Role and trust boundary

`auth` owns SSO identity, verified email, public citizen profile storage, and proof-gated association of an Arc Testnet wallet with an authenticated citizen. Wallet addresses are never accepted as profile fields and are never persisted solely because a client submitted an address. Passkey or credential material is not accepted by the profile API.

## Session contract

- Web clients may use SuperTokens cookies on `.juvantia.org`.
- Native clients use SuperTokens header transfer mode.
- Profile and wallet-proof routes derive the citizen only from the verified SuperTokens session.
- Responses never expose `supertokens_id`, passkey records, credential material, database errors, RPC errors, or environment values.

## Public user routes

| Endpoint | Method | Auth | Contract |
| --- | --- | --- | --- |
| `/api/auth/*` | SuperTokens methods | Public/session-specific | OTP, refresh, logout, and SuperTokens protocol |
| `/api/user/profile` | `GET` | Session required | Sanitized profile and read-only verified wallet state |
| `/api/user/profile` | `POST` | Session required | Strict `name`, `username`, `avatar_url?`, `status_description?`; unknown wallet/passkey/credential fields are rejected |
| `/api/user/wallet/challenge` | `POST` | Session required | Creates a short-lived, single-use challenge bound to session user, normalized address, Arc Testnet, and expiry |
| `/api/user/wallet/link` | `POST` | Session required | Verifies the challenge signature and atomically consumes the challenge while linking the wallet |
| `/api/user/wallet` | `POST` | Retired (`410`) | Never writes; directs clients to challenge/link |

New wallet-proof routes use:

```json
{ "success": true, "data": {}, "meta": { "requestId": "..." } }
```

```json
{ "success": false, "error": { "code": "...", "message": "...", "requestId": "...", "fields": {} } }
```

Profile success bodies retain their existing unwrapped compatibility shape for the gateway mapper, but are strict allow-list DTOs.

## Wallet proof protocol

- Network: `arcTestnet`; chain ID: `5042002`.
- Challenge request: `{ "address": "0x..." }`.
- Challenge response data: `challengeId`, normalized `address`, `network`, `chainId`, `message`, `issuedAt`, `expiresAt`.
- Link request: `{ "challengeId": "UUID", "signature": "0x..." }`; the address and message are taken only from the stored challenge.
- Signature verification uses viem Public Client `verifyMessage`, covering EOAs and supported smart-account signatures including deployed ERC-1271 and pre-deployed ERC-6492 accounts.
- Challenges expire after five minutes, are single-use, supersede older active challenges, allow at most five verification attempts, and are rate-limited to five issued challenges per citizen per ten minutes.
- A different wallet already linked to the citizen produces `WALLET_RECOVERY_REQUIRED`; no automatic overwrite occurs. Re-proving the same linked address is idempotent.

## Database contract

The existing `users.smart_wallet_address` remains the verified read-side wallet. A case-insensitive unique index prevents the same EVM address from being stored with different casing.

`wallet_link_challenges` stores the challenge ID, authenticated user binding, normalized address, fixed chain ID, signed message, issue/expiry timestamps, verification-attempt count, and consumption state. Link consumption and the `users` wallet update run in one PostgreSQL transaction with row locks. Expired/consumed rows are cleaned after a bounded retention period during challenge issuance.

## Required runtime configuration

- `POSTGRES_URI`
- `SUPERTOKENS_CONNECTION_URI`
- `SUPERTOKENS_API_KEY` when required by the SuperTokens deployment
- `ARC_TESTNET_RPC_URL` optional; defaults to the public Arc Testnet RPC endpoint

No deployment is implied by local changes; production remains controlled by the repository deployment workflow.
