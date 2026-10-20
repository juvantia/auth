# Forum web sign-in return

The forum enters central Auth using:

```text
https://auth.juvantia.org/?web_return=<URL-encoded absolute forum URL>
```

The destination must have the exact origin `https://forum.juvantia.org`. Normal
paths and queries survive the OTP `redirectToPath` hop and profile onboarding.
After the citizen's profile is complete, Auth calls `window.location.replace`
with that validated destination. An already signed-in citizen follows the same
path immediately after the verified self profile loads. Authentication travels
only through the existing shared SuperTokens cookies; no session token is added
to the destination.

Duplicate destinations, other origins/protocols/ports, userinfo, fragments,
control characters, backslashes and credential query parameters are rejected.
An invalid `web_return` alone does not activate the redirect/loading screen;
the citizen can use the central profile normally. Localhost is not allow-listed.
The native and legacy Deck handoff protocols are unchanged.

`test/web-return.test.ts` covers the allow-list, token exclusion, ordinary query
preservation and OTP redirect handling. Run all checks documented in `AGENTS.md`
before committing.
