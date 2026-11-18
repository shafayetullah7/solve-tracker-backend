import 'reflect-metadata';
import 'dotenv/config';
import assert from 'node:assert/strict';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { authTestEnvironment } from '../test/auth-env.ts';

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
});
const pool = new pg.Pool({ connectionString: target });
const { AppModule } = await import('../dist/app.module.js');
const { AuthService } = await import('../dist/modules/auth/auth.service.js');
const { PasswordService } =
  await import('../dist/modules/auth/password.service.js');
const { TokenService, digest } =
  await import('../dist/modules/auth/token.service.js');
const { EmailService } = await import('../dist/modules/email/email.service.js');
const { configureApp, createApiDocument } =
  await import('../dist/configure-app.js');
const sent = [];
let failEmail = false;
const email = {
  sendReset: async (to, token) => {
    if (!failEmail) sent.push({ to, token });
  },
};
const module = await Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(EmailService)
  .useValue(email)
  .compile();
const app = module.createNestApplication({ logger: false });
configureApp(app, true);
const emails = [];
let count = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  count++;
};
try {
  await migrate(drizzle({ client: pool }), { migrationsFolder: './drizzle' });
  await migrate(drizzle({ client: pool }), { migrationsFolder: './drizzle' });
  await app.init();
  const auth = app.get(AuthService),
    passwords = app.get(PasswordService),
    tokens = app.get(TokenService);
  const password = 'a long testing passphrase 🌱';
  async function signup() {
    const email = `phase3-${randomUUID()}@example.test`;
    emails.push(email);
    const result = await auth.register({ name: 'Test User', email, password });
    return { ...result, email };
  }
  const a = await signup();
  check(
    /^u[a-f0-9]{23}$/.test(a.user.handle),
    'register without handle assigns system handle',
  );
  const handleEmail = `handle-${randomUUID()}@example.test`;
  emails.push(handleEmail);
  const withHandle = await auth.register({
    name: 'Handle User',
    email: handleEmail,
    password,
    handle: 'unique_tester',
  });
  check(withHandle.user.handle === 'unique_tester', 'register with chosen handle');
  const dupHandleEmail = `handle-dup-${randomUUID()}@example.test`;
  emails.push(dupHandleEmail);
  await assert.rejects(
    auth.register({
      name: 'Dup',
      email: dupHandleEmail,
      password,
      handle: 'Unique_Tester',
    }),
    (e) =>
      e.getStatus() === 409 &&
      e.getResponse().code === 'HANDLE_IN_USE',
  );
  count++;
  const stored = (
    await pool.query('select password_hash from users where id=$1', [a.user.id])
  ).rows[0].password_hash;
  check(
    stored.startsWith('$argon2id$') &&
      (await passwords.verify(password, stored)),
    'Argon2id hashing',
  );
  await assert.rejects(
    auth.register({ name: 'Duplicate', email: a.email, password }),
    (e) => e.getStatus() === 409,
  );
  count++;
  const fresh = `phase3-${randomUUID()}@example.test`;
  emails.push(fresh);
  const duplicates = await Promise.allSettled([
    auth.register({ name: 'A', email: fresh, password }),
    auth.register({ name: 'B', email: fresh, password }),
  ]);
  check(
    duplicates.filter((r) => r.status === 'fulfilled').length === 1,
    'Concurrent email uniqueness',
  );
  await assert.rejects(
    auth.login({ email: a.email, password: 'wrong password' }),
    (e) => e.getStatus() === 401,
  );
  count++;
  const first = await auth.login({ email: a.email, password });
  const second = await auth.login({ email: a.email, password });
  check(
    (await auth.authenticate(first.tokens.access)).user.id === a.user.id,
    'Access authenticates',
  );
  await assert.rejects(auth.authenticate(first.tokens.refresh));
  count++;
  const old = await tokens.verify(first.tokens.refresh, 'refresh');
  const rotated = await auth.refresh(first.tokens.refresh);
  check(
    rotated.tokens.refresh !== first.tokens.refresh &&
      rotated.tokens.expiresAt.getTime() === first.tokens.expiresAt.getTime(),
    'Rotation retains absolute expiry',
  );
  await assert.rejects(
    auth.refresh(first.tokens.refresh),
    (e) => e.getStatus() === 401,
  );
  count++;
  await assert.rejects(auth.authenticate(rotated.tokens.access));
  count++;
  check(
    (await auth.authenticate(second.tokens.access)).user.id === a.user.id,
    'Other device unaffected by replay revocation',
  );
  await auth.logout(second.tokens.access, second.tokens.refresh);
  await assert.rejects(auth.authenticate(second.tokens.access));
  count++;
  const race = await auth.login({ email: a.email, password });
  const raceResult = await Promise.allSettled([
    auth.refresh(race.tokens.refresh),
    auth.refresh(race.tokens.refresh),
  ]);
  check(
    raceResult.filter((r) => r.status === 'fulfilled').length === 1,
    'Concurrent refresh creates one successor',
  );
  const winner = raceResult.find((r) => r.status === 'fulfilled').value;
  await assert.rejects(auth.authenticate(winner.tokens.access));
  count++;
  const logoutRace = await auth.login({ email: a.email, password });
  await Promise.allSettled([
    auth.refresh(logoutRace.tokens.refresh),
    auth.logout(logoutRace.tokens.access, logoutRace.tokens.refresh),
  ]);
  const sessionId = (await tokens.verify(logoutRace.tokens.refresh, 'refresh'))
    .sid;
  check(
    (
      await pool.query('select revoked_at from auth_sessions where id=$1', [
        sessionId,
      ])
    ).rows[0].revoked_at,
    'Logout wins against refresh',
  );
  const recoverySession = await auth.login({ email: a.email, password });
  const missing = await auth.forgot(`absent-${randomUUID()}@example.test`);
  const found = await auth.forgot(a.email);
  check(
    found.message === missing.message,
    'Forgot response does not enumerate accounts',
  );
  const token = sent.at(-1).token;
  await auth.forgot(a.email);
  check(sent.filter((e) => e.to === a.email).length === 1, 'Email cooldown');
  const resetPassword = 'a different testing passphrase 🍃';
  const resets = await Promise.allSettled([
    auth.reset({ token, password: resetPassword }),
    auth.reset({ token, password: resetPassword }),
  ]);
  check(
    resets.filter((r) => r.status === 'fulfilled').length === 1,
    'Reset token consumed once concurrently',
  );
  await assert.rejects(auth.authenticate(recoverySession.tokens.access));
  count++;
  await assert.rejects(auth.login({ email: a.email, password }));
  count++;
  check(
    (await auth.login({ email: a.email, password: resetPassword })).user.id ===
      a.user.id,
    'New password works',
  );
  const b = await signup();
  await auth.forgot(b.email);
  const expiredToken = sent.at(-1).token;
  await pool.query(
    "update password_reset_tokens set expires_at=now()-interval '1 second' where digest=$1",
    [digest(expiredToken)],
  );
  await assert.rejects(
    auth.reset({ token: expiredToken, password }),
    (e) => e.getStatus() === 400,
  );
  count++;
  const c = await signup();
  await auth.forgot(c.email);
  const resetC = sent.at(-1).token;
  const originalVerify = passwords.verify.bind(passwords);
  let release, ready;
  const gate = new Promise((resolve) => (release = resolve));
  const reached = new Promise((resolve) => (ready = resolve));
  passwords.verify = async (value, hash) => {
    const result = await originalVerify(value, hash);
    ready();
    await gate;
    return result;
  };
  const pendingLogin = auth.login({ email: c.email, password });
  try {
    await reached;
    await auth.reset({ token: resetC, password: resetPassword });
    release();
    await assert.rejects(pendingLogin, (e) => e.getStatus() === 401);
    count++;
  } finally {
    release();
    passwords.verify = originalVerify;
  }
  const replacement = await signup();
  await auth.forgot(replacement.email);
  const firstReset = sent.at(-1).token;
  await pool.query(
    "update password_reset_tokens set created_at=now()-interval '61 seconds' where user_id=$1",
    [replacement.user.id],
  );
  await auth.forgot(replacement.email);
  check(
    sent.at(-1).token !== firstReset,
    'New recovery token issued after cooldown',
  );
  await assert.rejects(auth.reset({ token: firstReset, password }));
  count++;
  const expiry = await auth.login({ email: b.email, password });
  const expiryId = (await tokens.verify(expiry.tokens.refresh, 'refresh')).sid;
  await pool.query(
    "update auth_sessions set expires_at=now()-interval '1 second' where id=$1",
    [expiryId],
  );
  await assert.rejects(auth.authenticate(expiry.tokens.access));
  await assert.rejects(auth.refresh(expiry.tokens.refresh));
  count += 2;
  // HTTP uses real providers/database; only email delivery is replaced.
  const headers = {
    Origin: 'http://localhost:3001',
    'X-Requested-With': 'practice',
  };
  await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: b.email, password })
    .expect(403);
  count++;
  await request(app.getHttpServer())
    .post('/auth/login')
    .set(headers)
    .send({ email: b.email, password, extra: true })
    .expect(400);
  count++;
  await request(app.getHttpServer())
    .post('/auth/register')
    .set(headers)
    .send({ name: 'X'.repeat(17000), email: b.email, password })
    .expect(413);
  count++;
  const login = await request(app.getHttpServer())
    .post('/auth/login')
    .set(headers)
    .send({ email: b.email, password })
    .expect(200);
  check(
    !JSON.stringify(login.body).includes('refresh') &&
      !JSON.stringify(login.body).includes('access'),
    'No JWT JSON payload',
  );
  const cookies = login.headers['set-cookie'];
  check(
    cookies.length === 2 &&
      cookies.every(
        (c) =>
          c.includes('HttpOnly') &&
          c.includes('SameSite=Lax') &&
          c.includes('Path=/'),
      ),
    'Cookie attributes',
  );
  const cookie = cookies.map((c) => c.split(';')[0]).join('; ');
  const probe = await request(app.getHttpServer())
    .get('/auth/session')
    .set('Cookie', cookie)
    .expect(200);
  check(
    !probe.headers['set-cookie'] &&
      probe.headers['cache-control'] === 'private, no-store',
    'Read-only uncached probe',
  );
  check(
    typeof probe.body.user?.handle === 'string' && probe.body.user.handle.length > 0,
    'session includes handle',
  );
  await request(app.getHttpServer())
    .post('/auth/logout')
    .set(headers)
    .set('Cookie', cookie)
    .expect(204);
  count++;
  await request(app.getHttpServer())
    .get('/auth/session')
    .set('Cookie', cookie)
    .expect(401);
  count++;
  for (let i = 0; i < 5; i++)
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .set(headers)
      .send({ email: 'not-an-account@example.test' })
      .expect(202);
  const limited = await request(app.getHttpServer())
    .post('/AUTH/FORGOT-PASSWORD/')
    .set(headers)
    .send({ email: 'not-an-account@example.test' })
    .expect(429);
  check(
    Boolean(limited.headers['retry-after']),
    'Rate limit applies to route aliases and returns Retry-After',
  );
  const { AuthCookies } = await import('../dist/modules/auth/auth.cookies.js');
  const productionCookies = new AuthCookies(
    new ConfigService({
      AUTH_COOKIE_SECURE: true,
      AUTH_ACCESS_COOKIE_NAME: '__Host-access',
      AUTH_REFRESH_COOKIE_NAME: '__Host-refresh',
    }),
  );
  let cookieHeader;
  const response = {
    setHeader: (_name, value) => {
      cookieHeader = value;
    },
  };
  productionCookies.set(response, first.tokens);
  check(
    cookieHeader.every(
      (c) =>
        c.includes('Secure') &&
        c.includes('HttpOnly') &&
        !c.includes('Domain='),
    ),
    'Production cookie flags',
  );
  productionCookies.clear(response);
  check(
    cookieHeader.every((c) => c.includes('Max-Age=0')),
    'Cookie clearing matches identity and expires immediately',
  );
  const doc = createApiDocument(app);
  const authPaths = Object.keys(doc.paths).filter((p) => p.startsWith('/auth/'));
  check(authPaths.length === 10, 'Ten documented auth routes');
  const sessionSchema =
    doc.paths['/auth/session']?.get?.responses?.['200']?.content?.[
      'application/json'
    ]?.schema;
  check(
    sessionSchema?.properties?.account?.properties?.googleLinked,
    'Session OpenAPI includes account flags',
  );
  check(
    sessionSchema?.properties?.user?.properties?.handle,
    'Session OpenAPI includes user.handle',
  );
  console.log(
    `Passed ${count} PostgreSQL/HTTP authentication assertions. No real emails sent.`,
  );
} finally {
  // Delete only this run's users; FK cascades remove their sessions/tokens.
  if (emails.length)
    await pool
      .query('delete from users where email=ANY($1::text[])', [emails])
      .catch(() => {});
  await app.close();
  await pool.end();
}
