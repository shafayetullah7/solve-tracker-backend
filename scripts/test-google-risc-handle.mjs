import 'reflect-metadata';
import 'dotenv/config';
import assert from 'node:assert/strict';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import {
  SignJWT,
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
} from 'jose';
import { authTestEnvironment } from '../test/auth-env.ts';

const SESSIONS_REVOKED =
  'https://schemas.openid.net/secevent/risc/event-type/sessions-revoked';
const CLIENT_ID = 'risc-handle-test.apps.googleusercontent.com';

const target = process.env.TEST_DATABASE_URL;
if (!target || !new URL(target).pathname.endsWith('_test'))
  throw new Error(
    'Provide a dedicated TEST_DATABASE_URL ending in _test; no application DATABASE_URL fallback is allowed.',
  );
Object.assign(process.env, authTestEnvironment, {
  NODE_ENV: 'test',
  DATABASE_URL: target,
  PORT: '3000',
  HOST: '127.0.0.1',
  SWAGGER_ENABLED: 'true',
  GOOGLE_OAUTH_ENABLED: 'true',
  GOOGLE_OAUTH_CLIENT_ID: CLIENT_ID,
  GOOGLE_OAUTH_CLIENT_SECRET: 'test-client-secret-value',
  GOOGLE_OAUTH_REDIRECT_URI: 'http://localhost:3001/api/auth/google/callback',
  GOOGLE_RISC_ENABLED: 'true',
});
const pool = new pg.Pool({ connectionString: target });
const { AppModule } = await import('../dist/app.module.js');
const { GoogleRiscService } = await import(
  '../dist/modules/auth/risc/google-risc.service.js'
);
const { GoogleRiscJwksCache } = await import(
  '../dist/modules/auth/risc/google-risc-jwks.cache.js'
);
const { AUTH_PROVIDER_GOOGLE } = await import(
  '../dist/modules/auth/google/auth-providers.js'
);

let count = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  count++;
};

async function localJwks() {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwk = await exportJWK(publicKey);
  const keySet = createLocalJWKSet({
    keys: [{ ...jwk, alg: 'RS256', use: 'sig' }],
  });
  return { privateKey, keySet };
}

async function signSet(privateKey, { jti, sub }) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
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
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer('https://accounts.google.com/')
    .setAudience(CLIENT_ID)
    .setJti(jti)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);
}

try {
  await migrate(drizzle({ client: pool }), { migrationsFolder: './drizzle' });
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  await module.init();

  const risc = module.get(GoogleRiscService);
  const jwks = module.get(GoogleRiscJwksCache);
  const { privateKey, keySet } = await localJwks();
  jwks.useKeySetForTests(keySet);

  const userId = randomUUID();
  const sessionId = randomUUID();
  const subject = `google-sub-${randomUUID()}`;
  const jti = randomUUID();

  await pool.query(
    `INSERT INTO users (id, name, email, password_hash) VALUES ($1, $2, $3, NULL)`,
    [userId, 'RISC User', `risc-${randomUUID()}@example.test`],
  );
  await pool.query(
    `INSERT INTO auth_provider_identities (id, user_id, provider, provider_subject, provider_email)
     VALUES ($1, $2, $3, $4, $5)`,
    [randomUUID(), userId, AUTH_PROVIDER_GOOGLE, subject, 'risc@example.test'],
  );
  const expires = new Date(Date.now() + 3_600_000);
  await pool.query(
    `INSERT INTO auth_sessions (id, user_id, refresh_digest, expires_at) VALUES ($1, $2, $3, $4)`,
    [sessionId, userId, `digest-${randomUUID()}`, expires],
  );

  const set = await signSet(privateKey, { jti, sub });
  const verified = await risc.verifySet(set);
  check(verified.jti === jti, 'verifySet returns jti');

  const first = await risc.handleVerifiedEvent(verified);
  check(first.status === 'revoked' && first.revokedCount === 1, 'handle revokes session');

  const sessionRow = await pool.query(
    'select revoked_at from auth_sessions where id=$1',
    [sessionId],
  );
  check(sessionRow.rows[0]?.revoked_at != null, 'session revoked_at set');

  const receiptRow = await pool.query(
    'select jti, user_id from risc_event_receipts where jti=$1',
    [jti],
  );
  check(
    receiptRow.rows[0]?.jti === jti && receiptRow.rows[0]?.user_id === userId,
    'receipt stored',
  );

  const second = await risc.handleVerifiedEvent(verified);
  check(second.status === 'duplicate', 'duplicate jti on redelivery');

  const sessionAgain = await pool.query(
    'select count(*)::int as n from auth_sessions where id=$1 and revoked_at is not null',
    [sessionId],
  );
  check(sessionAgain.rows[0]?.n === 1, 'no double revoke');

  console.log(`google risc handle integration: ${count} checks passed`);
} finally {
  await pool.end();
}