# Juvantia Auth Service

This is the centralized Authentication and Identity service for the Juvantia ecosystem. It provides Single Sign-On (SSO) capabilities using SuperTokens for identity management across all Juvantia portals.

## Transparency Statement
We believe in open, transparent infrastructure. This repository is open-sourced to allow our community to audit the identity and security layer of Juvantia. We are building the digital foundations for realistic robotic tech-parks, and trust is our core component.

## Architecture
- **Framework**: Next.js (App Router)
- **SSO Provider**: SuperTokens (Passwordless Email Auth)
- **Database**: PostgreSQL (Shared ecosystem database)

## Features
- **Global Session Management**: Cross-domain SSO across `*.juvantia.org` domains.
- **Unified Identity**: JWTs shared across all microservices with unified user identity (name, email, username).

## Security & Usage
- This service handles sensitive authentication flows.
- Contributions are not accepted at this time, but the codebase is fully open for review and educational purposes.
- For bug reports or security concerns, please contact our team via the official [Juvantia Forum](https://forum.juvantia.org).

---
© Juvantia Foundation
