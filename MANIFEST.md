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
| `/api/user/wallet/bind` | `POST` | Session required | Idempotently binds the address returned by a successful native wallet operation to the current citizen; conflicting bindings are rejected |
| `/api/user/wallet/send-intent` | `POST` | Session required | Resolves a recipient username to its active smart wallet and prepares an exact EURC Arc Testnet transfer intent for native passkey signing |
| `/api/user/upload` | `POST` | Session required | Multipart `file`; verified JPG, PNG, or WebP only, maximum 5 MB, server-generated filename |

Profile success bodies retain their existing unwrapped compatibility shape for the gateway mapper, but are strict allow-list DTOs.

Avatar uploads ignore the client filename, validate both MIME and file signature,
reject SVG/executable payloads, and are written with a random non-overwriting
name. Native clients access this capability only through `/v1/auth/upload`.

## Wallet Binding Protocol

- `smart_wallet_address` is linked directly to the citizen's `supertokens_id` in PostgreSQL via authorized internal microservice / session initialization calls.
- Redundant cryptographic signature challenge flows (`/api/user/wallet/challenge` and `/api/user/wallet/link`) have been removed.

## Database contract

The existing `users.smart_wallet_address` remains the verified read-side wallet. A case-insensitive unique index prevents the same EVM address from being stored with different casing.

## Required runtime configuration

- `POSTGRES_URI`
- `SUPERTOKENS_CONNECTION_URI`
- `SUPERTOKENS_API_KEY` when required by the SuperTokens deployment
- `ARC_TESTNET_RPC_URL` optional; defaults to the public Arc Testnet RPC endpoint

No deployment is implied by local changes; production remains controlled by the repository deployment workflow.
