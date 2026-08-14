import { createHash, randomBytes } from "node:crypto";

import { query } from "@/lib/db";

const codeLifetimeSeconds = 60;
const codePattern = /^[A-Za-z0-9_-]{43}$/;
const verifierPattern = /^[A-Za-z0-9._~-]{43,128}$/;
const redirectUris = new Set([
  "juvantia://auth/callback",
  "juvantia-dev://auth/callback",
  "juvantia-staging://auth/callback",
]);

interface NativeAuthCodeRow {
  user_id: string;
}

let initialized: Promise<void> | undefined;

function base64Url(value: Buffer): string {
  return value.toString("base64url");
}

function codeHash(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function challengeFor(verifier: string): string {
  return base64Url(createHash("sha256").update(verifier).digest());
}

async function initialize(): Promise<void> {
  initialized ??= query(`
    CREATE TABLE IF NOT EXISTS native_auth_codes (
      code_hash CHAR(64) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      redirect_uri TEXT NOT NULL,
      code_challenge VARCHAR(128) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      consumed_at TIMESTAMPTZ
    )
  `).then(() => undefined);
  return initialized;
}

export function isAllowedRedirectUri(value: string): boolean {
  return redirectUris.has(value);
}

export async function issueNativeAuthCode(input: {
  userId: string;
  redirectUri: string;
  codeChallenge: string;
}): Promise<string> {
  if (!isAllowedRedirectUri(input.redirectUri) || !codePattern.test(input.codeChallenge)) {
    throw new TypeError("Invalid native authorization request.");
  }
  await initialize();
  const code = base64Url(randomBytes(32));
  await query(
    `INSERT INTO native_auth_codes
      (code_hash, user_id, redirect_uri, code_challenge, expires_at)
     VALUES ($1, $2, $3, $4, NOW() + INTERVAL '${codeLifetimeSeconds} seconds')`,
    [codeHash(code), input.userId, input.redirectUri, input.codeChallenge],
  );
  return code;
}

export async function consumeNativeAuthCode(input: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<string | null> {
  if (!codePattern.test(input.code) || !verifierPattern.test(input.codeVerifier)) {
    return null;
  }
  await initialize();
  const result = await query<NativeAuthCodeRow>(
    `DELETE FROM native_auth_codes
     WHERE code_hash = $1
       AND redirect_uri = $2
       AND code_challenge = $3
       AND consumed_at IS NULL
       AND expires_at > NOW()
     RETURNING user_id`,
    [codeHash(input.code), input.redirectUri, challengeFor(input.codeVerifier)],
  );
  return result.rows[0]?.user_id ?? null;
}
