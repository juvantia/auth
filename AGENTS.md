# Juvantia Auth Instructions (`auth`)

**Service:** Unified identity provider, SSO, and public citizen profiles for the Juvantia ecosystem.
**Domain:** `https://auth.juvantia.org`
**Core Tech:** Next.js App Router (Node.js 20), SuperTokens (Passwordless Email OTP), PostgreSQL (`postgres-shared`), Zod, Viem.
**Container:** `auth-service` (port 3000), dependency: `supertokens` (port 3567), network: `juvantia-network`.

---

## 1. Architectural Role and Trust Boundaries

1. **SSO and Citizen Identification**:
   - `auth` owns SuperTokens accounts, verified email addresses, and public citizen profile data (`name`, `status_description`, `active_phalera_id`). Core owns business status and qualifications.
   - Citizen identification on protected endpoints MUST be performed strictly via verified SuperTokens sessions (`withSession`).
   - Decoded JWT payloads or arbitrary Bearer tokens without cryptographic session verification MUST be rejected (`401 Unauthorized`).
   - The service NEVER discloses internal database errors, RPC errors, or environment variable values to the client.

2. **Prohibition of Arbitrary Wallet Binding**:
   - Wallet addresses MUST NOT be accepted as incoming profile fields under any circumstances.
   - Direct wallet binding routes (`/api/user/wallet/bind`) and transfer intent creation (`/api/user/wallet/send-intent`) have been **removed** from `auth`.
   - The cryptographic proof protocol for ZeroDev Kernel smart account (ERC-4337) ownership belongs to the `core` service and is routed via the API Gateway: `/v1/wallet/binding/challenge` and `/v1/wallet/binding/confirm`.
   - `auth` performs only **read-only queries** for the active record in the `wallet_bindings` table matching the current `BLOCKCHAIN_CHAIN_ID`.

3. **Storage of Secrets and Key Material**:
   - Storing or transmitting private keys, seed phrases, biometric data, or passkey secrets within the service is STRICTLY PROHIBITED.

---

## 2. Client Session Contract

- **Web clients**: use cross-domain SuperTokens cookies on `.juvantia.org`.
- **Native mobile client (`Juvantia Citizen`)**: uses header-based token transmission (`st-auth-mode: header`, headers `st-access-token`, `st-refresh-token`, `anti-csrf`).
- Routing of external citizen traffic directly to `auth` is permitted ONLY for the authorization protocol `/api/auth/*`. All other mobile application operations MUST go through the API Gateway [`api.juvantia.org/v1`](../api).

---

## 3. User Route Specifications

| Endpoint | Method | Authorization | Description and Contract |
| :--- | :--- | :--- | :--- |
| `/api/auth/*` | SuperTokens methods | Public / Session | Email OTP login, session refresh, logout, SuperTokens core protocol. |
| `/api/user/profile` | `GET` | Session required | Reads citizen profile and verified smart account address (`wallet_bindings`). Returns `needsOnboarding: true` if name is unset; an absent active smart account is valid. |
| `/api/user/profile` | `POST` | Session required | Strict DTO: `name` (the callsign, 1-32 chars), `status_description?`, `active_phalera_id?`. Any unauthorized fields, wallet, password, or role fields are rejected with a validation error. Legacy `username` and `avatar_url` are completely removed. |

---

Profile descriptions are authored only by the citizen. Missing descriptions remain null; Core status recalculation must never replace them. Auth neither stores nor reads passkey material; the legacy column removal is schema cleanup only.

## 4. Database Contract

`auth` connects to the shared PostgreSQL cluster (`postgres-shared`):
- `supertokens` database: maintained directly by the `supertokens` service (SuperTokens schema).
- `juvantia` database:
  - `users` table: public citizen profiles (`supertokens_id`, `email`, `name`, `status`, `status_description`, `smart_wallet_address` as read-side compatibility). Legacy `username` and `avatar_url` columns are permanently dropped.
  - `wallet_bindings` table: source of truth for the smart account address (`state = 'active'`, `chain_id = BLOCKCHAIN_CHAIN_ID`).

---

## 5. Local Verification Protocol

Before committing changes, the following checks MUST be executed inside the `auth` directory:
```sh
npm test              # Run the Vitest test suite (all tests must pass)
npx tsc --noEmit      # TypeScript static type check
npm run lint          # Run ESLint check
```

---

## 6. Deployment and Infrastructure

- The repository is deployed via GitHub Actions (`.github/workflows/deploy.yml`) on push to the `main` branch.
- All commits and pushes MUST be executed strictly inside the `auth/` directory.
- On the VPS, the service runs under Docker Compose in `/root/auth`:
  - `auth-service`: image `auth-auth:latest`, port 3000.
  - `supertokens`: image `registry.supertokens.io/supertokens/supertokens-postgresql:latest`, port 3567.
