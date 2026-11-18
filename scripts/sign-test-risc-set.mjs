#!/usr/bin/env node
/**
 * Sign a synthetic RISC SET with a local RSA key for manual curl against
 * localhost/tunnel. NOT valid for Google stream:verify (Google signs SETs).
 *
 * Requires: GOOGLE_RISC_ENABLED=true and test JWKS hook only in integration tests.
 * For Nest without JWKS override, this token will fail signature verify — use
 * test-google-risc-http.mjs instead.
 *
 * Example:
 *   pnpm sign:test-risc-set > /tmp/set.jwt
 *   curl -X POST http://127.0.0.1:3000/auth/google/risc \
 *     -H 'Content-Type: application/secevent+jwt' --data-binary @/tmp/set.jwt
 */
import { randomUUID } from 'node:crypto';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';

const SESSIONS_REVOKED =
  'https://schemas.openid.net/secevent/risc/event-type/sessions-revoked';

const clientId =
  process.env.GOOGLE_OAUTH_CLIENT_ID ??
  'test-risc-sign.apps.googleusercontent.com';
const sub = process.env.RISC_TEST_SUB ?? `google-sub-${randomUUID()}`;
const jti = process.env.RISC_TEST_JTI ?? randomUUID();

const { privateKey, publicKey } = await generateKeyPair('RS256');
const jwk = await exportJWK(publicKey);

const now = Math.floor(Date.now() / 1000);
const set = await new SignJWT({
  events: {
    [SESSIONS_REVOKED]: {
      subject: {
        subject_type: 'iss-sub',
        iss: 'https://accounts.google.com/',
        sub,
      },
    },
  },
})
  .setProtectedHeader({ alg: 'RS256', kid: 'local-test' })
  .setIssuer('https://accounts.google.com/')
  .setAudience(clientId)
  .setJti(jti)
  .setIssuedAt(now)
  .setExpirationTime(now + 3600)
  .sign(privateKey);

process.stderr.write(
  `# Local test SET (jti=${jti}, sub=${sub}). Public JWK for manual JWKS inject:\n${JSON.stringify({ ...jwk, alg: 'RS256', use: 'sig', kid: 'local-test' })}\n`,
);
process.stdout.write(set);