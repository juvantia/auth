# Auth Manifest (`auth.juvantia.org`)

**Service**: `auth`  
**Domain**: `https://auth.juvantia.org`  
**Core Tech**: Next.js App Router, SuperTokens, PostgreSQL, Zod, viem.

## Role and trust boundary

`auth` owns SSO identity, verified email, public citizen profile storage, and the read-only association of a proven Chiado ZeroDev wallet with an authenticated citizen. Wallet addresses are never accepted as profile fields and are never persisted solely because a client submitted an address. Passkey or credential material is not accepted by the profile API.

## Session contract

- Web clients may use SuperTokens cookies on `.juvantia.org`.
- Native clients use SuperTokens header transfer mode.
- Profile routes derive the citizen only from the verified SuperTokens session.
- Responses never expose `supertokens_id`, passkey records, credential material, database errors, RPC errors, or environment values.

## Public user routes

| Endpoint | Method | Auth | Contract |
| --- | --- | --- | --- |
| `/api/auth/*` | SuperTokens methods | Public/session-specific | OTP, refresh, logout, and SuperTokens protocol |
| `/api/user/profile` | `GET` | Session required | Sanitized profile and read-only verified wallet state |
| `/api/user/profile` | `POST` | Session required | Strict `name`, `username`, `avatar_url?`, `status_description?`; unknown wallet/passkey/credential fields are rejected |
| `/api/user/upload` | `POST` | Session required | Multipart `file`; verified JPG, PNG, or WebP only, maximum 5 MB, server-generated filename |

Profile success bodies retain their existing unwrapped compatibility shape for the gateway mapper, but are strict allow-list DTOs.

Avatar uploads ignore the client filename, validate both MIME and file signature,
reject SVG/executable payloads, and are written with a random non-overwriting
name. Native clients access this capability only through `/v1/auth/upload`.

## Wallet binding boundary

Core owns the proof protocol through gateway `/v1/wallet/binding/challenge` and `/confirm`; see [WALLET_PROTOCOL.md](../core/WALLET_PROTOCOL.md). Auth cannot create or replace bindings. Its old direct bind/send-intent routes are removed.

Profiles read only active `wallet_bindings` rows on chain 10200. A legacy address in `users.smart_wallet_address` does not qualify. Profile mutations never accept wallet fields. Session verification is fail-closed; decoded JWT payloads do not grant access.

## Database contract and deployment order

Core initializes `wallet_bindings` after `users`. Deploy the new schema before this Auth release as part of the coordinated migration. Auth owns profile fields, while Core's proof transaction maintains `users.smart_wallet_address` as a read-side compatibility column. A case-insensitive unique index prevents address casing duplicates. No private keys or biometric material are stored.

## Required runtime configuration

- `POSTGRES_URI`
- `SUPERTOKENS_CONNECTION_URI`
- `SUPERTOKENS_API_KEY` when required by the SuperTokens deployment

No deployment is implied by local changes; production remains controlled by the repository deployment workflow.
