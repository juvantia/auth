# Juvantia Auth

**Protocol-Level Authentication & Smart Account Provisioning**

Juvantia Auth is the centralized identity provider and smart wallet orchestrator for the Juvantia ecosystem. It provides a seamless, passwordless entry point into the physical-digital frontier of Juvantia, ensuring every operative is equipped with a non-custodial Smart Account (ERC-4337) from the moment they join.

## 🛡️ Transparency & Trust

This repository is made public to ensure full transparency regarding how user identities are handled and how Smart Accounts are provisioned. Operatives can verify the code to understand the security parameters of their digital sovereignty within the Juvantia Ecosystem.

**Key Security Pillars:**
- **Non-Custodial**: Your keys, your assets. Juvantia Auth utilizes **ZeroDev** and **Passkeys (WebAuthn)** for account abstraction. Private keys are never stored on our servers; they reside in your device's secure enclave (FaceID, TouchID, or Hardware Keys).
- **Sovereign Identity**: SSO is powered by **SuperTokens**, providing secure, cross-domain sessions across all Juvantia sectors (`city`, `fabrica`, `deck`).
- **Auditability**: By keeping this core component open for inspection, we ensure the community can audit the logic behind wallet generation and session management.

## ⚙️ Core Technology Stack

- **Framework**: Next.js (App Router)
- **Identity**: SuperTokens (Passwordless OTP)
- **Account Abstraction**: ZeroDev (Kernel v3.1)
- **Network**: Arc Testnet (EVM)
- **Storage**: PostgreSQL

## 📂 Repository Structure

- `/src/lib/zerodev.ts`: Logic for deterministic Smart Account creation and Passkey validation.
- `/src/config/backend.ts`: SuperTokens core configuration and JWT issuance.
- `/src/app/api/user`: Internal API for profile management and on-chain identity binding.

## 🛠️ Local Development (For Audit Purposes)

To inspect or run a local instance for verification:

1. **Clone & Install**:
   ```bash
   npm install
   ```

2. **Environment Configuration**:
   Create a `.env.local` based on the required parameters:
   - `NEXT_PUBLIC_PROJECT_ID`: ZeroDev Project ID.
   - `POSTGRES_URI`: Database connection string.
   - `SUPERTOKENS_CONNECTION_URI`: SuperTokens core URI.
   - `SMTP_*`: Credentials for the notification service.

3. **Run**:
   ```bash
   npm run dev
   ```

## 📜 Governance & Ownership

This software is developed and maintained by the **Juvantia Foundation**. 

While the source code is public for transparency and auditability, it is **not** an open-source project for third-party commercial redistribution. All rights are reserved by the Juvantia Foundation.

---
**Status: Operational**
**Sector: Identity & Sovereignty**
