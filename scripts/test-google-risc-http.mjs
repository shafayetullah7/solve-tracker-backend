import 'reflect-metadata';
import 'dotenv/config';
import assert from 'node:assert/strict';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Test } from '@nestjs/testing';
import request from 'supertest';
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
const CLIENT_ID = 'risc-http-test.apps.googleusercontent.com';

const target = process.env.TEST_DATABASE_URL;
if (!target || !new URL(target).pathname.endsWith('_test'))
  throw new Error(
    'Provide a dedicated TEST_DATABASE_URL ending in _test; no application DATABASE_URL fallback is allowed.',
  );

const enabledEnv = {
  ...authTestEnvironment,
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
};

const disabledEnv = {
  ...authTestEnvironment,
  NODE_ENV: 'test',
  DATABASE_URL: target,
  PORT: '3000',
  HOST: '127.0.0.1',
  SWAGGER_ENABLED: 'true',
  GOOGLE_OAUTH_ENABLED: 'false',
  GOOGLE_RISC_ENABLED: 'false',
};

const pool = new pg.Pool({ connectionString: target });
const { AppModule } = await import('../dist/app.module.js');
const { configureApp } = await import('../dist/configure-app.js');
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

async function signSet(privateKey, { jti, sub, aud }) {
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
    .setAudience(aud ?? CLIENT_ID)
    .setJti(jti)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);
}

try {
  await migrate(drizzle({ client: pool }), { migrationsFolder: './drizzle' });

  Object.assign(process.env, enabledEnv);
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = module.createNestApplication({ logger: false });
  configureApp(app, true);
  await app.init();
  const agent = request(app.getHttpServer());
  const jwks = module.get(GoogleRiscJwksCache);
  const { privateKey, keySet } = await localJwks();
  jwks.useKeySetForTests(keySet);

  const userId = randomUUID();
  const sessionId = randomUUID();
  const subject = `google-sub-${randomUUID()}`;
  const jti = randomUUID();

  await pool.query(
    `INSERT INTO users (id, name, email, password_hash) VALUES ($1, $2, $3, NULL)`,
    [userId, 'RISC HTTP User', `risc-http-${randomUUID()}@example.test`],
  );
  await pool.query(
    `INSERT INTO auth_provider_identities (id, user_id, provider, provider_subject, provider_email)
     VALUES ($1, $2, $3, $4, $5)`,
    [randomUUID(), userId, AUTH_PROVIDER_GOOGLE, subject, 'risc-http@example.test'],
  );
  const expires = new Date(Date.now() + 3_600_000);
  await pool.query(
    `INSERT INTO auth_sessions (id, user_id, refresh_digest, expires_at) VALUES ($1, $2, $3, $4)`,
    [sessionId, userId, `digest-${randomUUID()}`, expires],
  );

  const set = await signSet(privateKey, { jti, sub });
  await agent
    .post('/auth/google/risc')
    .set('Content-Type', 'application/secevent+jwt')
    .send(set)
    .expect(202);
  check(true, 'POST valid SET returns 202');

  const sessionRow = await pool.query(
    'select revoked_at from auth_sessions where id=$1',
    [sessionId],
  );
  check(sessionRow.rows[0]?.revoked_at != null, 'session revoked via HTTP');

  await agent
    .post('/auth/google/risc')
    .set('Content-Type', 'application/secevent+jwt')
    .send(set)
    .expect(202);
  check(true, 'duplicate jti still 202');

  const malformed = await agent
    .post('/auth/google/risc')
    .set('Content-Type', 'text/plain')
    .send('not-a-jwt')
    .expect(400);
  check(
    malformed.body?.code === 'RISC_SET_MALFORMED',
    'malformed SET returns 400',
  );

  await agent.post('/auth/google/risc').send('').expect(400);
  check(true, 'empty body returns 400');

  await app.close();

  Object.assign(process.env, disabledEnv);
  const disabledModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const disabledApp = disabledModule.createNestApplication({ logger: false });
  configureApp(disabledApp, true);
  await disabledApp.init();
  await request(disabledApp.getHttpServer())
    .post('/auth/google/risc')
    .send('token')
    .expect(404);
  check(true, 'disabled feature returns 404');
  await disabledApp.close();

  console.log(`google risc http integration: ${count} checks passed`);
} finally {
  await pool.end();
}