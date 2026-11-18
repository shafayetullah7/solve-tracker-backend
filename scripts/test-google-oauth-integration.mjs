import 'reflect-metadata';
import 'dotenv/config';
import assert from 'node:assert/strict';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { authTestEnvironment } from '../test/auth-env.ts';
import { GOOGLE_OAUTH_STATE_COOKIE } from '../dist/modules/auth/google/google-oauth.constants.js';

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
  GOOGLE_OAUTH_CLIENT_ID: 'test.apps.googleusercontent.com',
  GOOGLE_OAUTH_CLIENT_SECRET: 'test-client-secret-value',
  GOOGLE_OAUTH_REDIRECT_URI: 'http://localhost:3001/api/auth/google/callback',
});
const pool = new pg.Pool({ connectionString: target });
const { AppModule } = await import('../dist/app.module.js');
const { GoogleOAuthService } = await import('../dist/modules/auth/google/google-oauth.service.js');
const { configureApp, createApiDocument } =
  await import('../dist/configure-app.js');

let count = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  count++;
};

const mockProfile = {
  subject: `sub-${randomUUID()}`,
  email: `http-${randomUUID()}@example.test`,
  name: 'Http User',
};

const googleMock = {
  isEnabled: () => true,
  buildAuthorizationUrl: ({ state }) =>
    `https://accounts.google.com/o/oauth2/v2/auth?state=${state}`,
  exchangeCodeForIdToken: async () => 'mock-id-token',
  verifyIdToken: async () => mockProfile,
  clientId: () => process.env.GOOGLE_OAUTH_CLIENT_ID,
  scopes: () => 'openid email profile',
};

try {
  await migrate(drizzle({ client: pool }), { migrationsFolder: './drizzle' });
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(GoogleOAuthService)
    .useValue(googleMock)
    .compile();
  const app = module.createNestApplication({ logger: false });
  configureApp(app, true);
  await app.init();
  const agent = request(app.getHttpServer());
  const csrfHeaders = {
    Origin: 'http://localhost:3001',
    'X-Requested-With': 'practice',
  };

  const start = await agent.get('/auth/google?next=/app').expect(302);
  check(
    start.headers.location?.startsWith('https://accounts.google.com'),
    'redirect to Google',
  );
  const setCookie = start.headers['set-cookie'];
  check(
    Array.isArray(setCookie) &&
      setCookie.some((c) => c.startsWith(`${GOOGLE_OAUTH_STATE_COOKIE}=`)),
    'state cookie on start',
  );
  const stateCookie = setCookie.find((c) =>
    c.startsWith(`${GOOGLE_OAUTH_STATE_COOKIE}=`),
  );
  const cookieValue = stateCookie?.split(';')[0]?.split('=').slice(1).join('=');
  const stateParam = new URL(start.headers.location).searchParams.get('state');
  check(stateParam, 'state in authorize URL');

  const callback = await agent
    .get(`/auth/google/callback?code=abc&state=${stateParam}`)
    .set('Cookie', `${GOOGLE_OAUTH_STATE_COOKIE}=${cookieValue}`)
    .expect(302);
  check(
    callback.headers.location === 'http://localhost:3001/app',
    'redirect to app',
  );
  const authCookies = callback.headers['set-cookie'] ?? [];
  check(
    authCookies.some((c) => c.startsWith('practice_access=')),
    'access cookie set',
  );
  check(
    authCookies.some((c) => c.startsWith('practice_refresh=')),
    'refresh cookie set',
  );
  const googleUserCookie = authCookies.map((c) => c.split(';')[0]).join('; ');
  const googleSession = await agent
    .get('/auth/session')
    .set('Cookie', googleUserCookie)
    .expect(200);
  check(
    googleSession.body.account?.googleLinked === true &&
      googleSession.body.account?.hasPassword === false,
    'session account flags for google-only user',
  );

  const setPass = 'a long testing passphrase 🌱';
  await agent
    .post('/auth/set-password')
    .set(csrfHeaders)
    .set('Cookie', googleUserCookie)
    .send({ newPassword: setPass })
    .expect(204);
  const afterSet = await agent
    .get('/auth/session')
    .set('Cookie', googleUserCookie)
    .expect(200);
  check(afterSet.body.account?.hasPassword === true, 'hasPassword after set-password');

  await agent
    .delete('/auth/google/link')
    .set(csrfHeaders)
    .set('Cookie', googleUserCookie)
    .expect(204);
  const afterUnlink = await agent
    .get('/auth/session')
    .set('Cookie', googleUserCookie)
    .expect(200);
  check(afterUnlink.body.account?.googleLinked === false, 'unlinked via DELETE');

  const password = 'another testing passphrase 🌱';
  const pwEmail = `link-http-${randomUUID()}@example.test`;
  await agent
    .post('/auth/register')
    .set(csrfHeaders)
    .send({ name: 'Link User', email: pwEmail, password })
    .expect(201);
  const login = await agent
    .post('/auth/login')
    .set(csrfHeaders)
    .send({ email: pwEmail, password })
    .expect(200);
  const pwCookie = login.headers['set-cookie']
    .map((c) => c.split(';')[0])
    .join('; ');
  const linkProfile = {
    subject: `sub-${randomUUID()}`,
    email: pwEmail,
    name: 'Link User',
  };
  googleMock.verifyIdToken = async () => linkProfile;

  const linkStart = await agent
    .get('/auth/google?mode=link')
    .set('Cookie', pwCookie)
    .expect(302);
  const linkStateCookie = linkStart.headers['set-cookie']?.find((c) =>
    c.startsWith(`${GOOGLE_OAUTH_STATE_COOKIE}=`),
  );
  const linkCookieValue = linkStateCookie
    ?.split(';')[0]
    ?.split('=')
    .slice(1)
    .join('=');
  const linkState = new URL(linkStart.headers.location).searchParams.get('state');
  const linkCallback = await agent
    .get(`/auth/google/callback?code=abc&state=${linkState}`)
    .set(
      'Cookie',
      `${pwCookie}; ${GOOGLE_OAUTH_STATE_COOKIE}=${linkCookieValue}`,
    )
    .expect(302);
  check(
    linkCallback.headers.location?.includes('/app/profile') &&
      linkCallback.headers.location?.includes('google_linked=1'),
    'profile link redirect',
  );
  const linkedSession = await agent
    .get('/auth/session')
    .set('Cookie', pwCookie)
    .expect(200);
  check(linkedSession.body.account?.googleLinked === true, 'linked on password user');

  const disabledModule = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(GoogleOAuthService)
    .useValue({ ...googleMock, isEnabled: () => false })
    .compile();
  const disabledApp = disabledModule.createNestApplication({ logger: false });
  configureApp(disabledApp, true);
  await disabledApp.init();
  await request(disabledApp.getHttpServer()).get('/auth/google').expect(404);
  check(true, 'disabled returns 404');
  await disabledApp.close();

  const doc = createApiDocument(app);
  check(
    Object.keys(doc.paths).filter((p) => p.startsWith('/auth/')).length === 9,
    'OAuth redirects excluded from OpenAPI (includes set-password)',
  );

  console.log(`google oauth http: ${count} checks passed`);
  await app.close();
} finally {
  await pool.end().catch(() => {});
}