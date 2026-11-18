import 'reflect-metadata';
import 'dotenv/config';
import assert from 'node:assert/strict';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
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
  GOOGLE_OAUTH_ENABLED: 'false',
});
const pool = new pg.Pool({ connectionString: target });

let count = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  count++;
};

try {
  await migrate(drizzle({ client: pool }), { migrationsFolder: './drizzle' });
  const { AppModule } = await import('../dist/app.module.js');
  const { AuthService } = await import('../dist/modules/auth/auth.service.js');
  const { PasswordService } = await import('../dist/modules/auth/password.service.js');
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = module.createNestApplication({ logger: false });
  await app.init();
  const auth = app.get(AuthService);
  const passwords = app.get(PasswordService);
  const { GoogleOAuthError } = await import(
    '../dist/modules/auth/google-oauth.errors.js'
  );

  const subject = `sub-${randomUUID()}`;
  const email = `go-${randomUUID()}@example.test`;
  const session = await auth.signInWithGoogle({
    subject,
    email,
    name: 'Google New',
  });
  check(session.user.email === email, 'register via Google');
  const row = (
    await pool.query(
      'select password_hash from users where id = $1',
      [session.user.id],
    )
  ).rows[0];
  check(row.password_hash === null, 'google-only password_hash');

  const password = 'a long testing passphrase 🌱';
  const pwEmail = `pw-${randomUUID()}@example.test`;
  const hash = await passwords.hash(password);
  const pwUserId = randomUUID();
  await pool.query(
    `insert into users (id, name, email, password_hash) values ($1, $2, $3, $4)`,
    [pwUserId, 'Pw User', pwEmail, hash],
  );
  const linkSub = `sub-${randomUUID()}`;
  const linked = await auth.signInWithGoogle({
    subject: linkSub,
    email: pwEmail,
    name: 'Linked',
  });
  check(linked.user.id === pwUserId, 'auto-link on email');
  const identities = (
    await pool.query(
      'select provider_subject from auth_provider_identities where user_id = $1',
      [pwUserId],
    )
  ).rows;
  check(
    identities.some((r) => r.provider_subject === linkSub),
    'identity row for link',
  );

  const again = await auth.signInWithGoogle({
    subject: linkSub,
    email: pwEmail,
  });
  check(again.user.id === pwUserId, 'existing Google sub sign-in');

  const googleOnlyId = randomUUID();
  const googleOnlyEmail = `golink-${randomUUID()}@example.test`;
  await pool.query(
    `insert into users (id, name, email, password_hash) values ($1, $2, $3, $4)`,
    [googleOnlyId, 'Google Only', googleOnlyEmail, null],
  );
  const profileSub = `sub-${randomUUID()}`;
  await auth.linkGoogleToUser(googleOnlyId, {
    subject: profileSub,
    email: googleOnlyEmail,
    name: 'Google Only',
  });
  let flags = await auth.accountFlags(googleOnlyId);
  check(flags.googleLinked && !flags.hasPassword, 'profile link flags');

  const otherId = randomUUID();
  await pool.query(
    `insert into users (id, name, email, password_hash) values ($1, $2, $3, $4)`,
    [otherId, 'Other', `other-${randomUUID()}@example.test`, hash],
  );
  await assert.rejects(
    () =>
      auth.linkGoogleToUser(otherId, {
        subject: profileSub,
        email: googleOnlyEmail,
        name: 'Conflict',
      }),
    (error) => error instanceof GoogleOAuthError,
    'profile link conflict',
  );
  count++;

  await auth.setPassword(googleOnlyId, { newPassword: password });
  flags = await auth.accountFlags(googleOnlyId);
  check(flags.hasPassword, 'set password for google-only');

  await assert.rejects(
    () => auth.setPassword(googleOnlyId, { newPassword: `${password}2` }),
    (e) => e.getStatus?.() === 400,
    'set password when already set',
  );
  count++;

  await auth.unlinkGoogle(googleOnlyId);
  flags = await auth.accountFlags(googleOnlyId);
  check(!flags.googleLinked, 'unlink google');

  await auth.linkGoogleToUser(googleOnlyId, {
    subject: profileSub,
    email: googleOnlyEmail,
    name: 'Google Only',
  });
  await pool.query('update users set password_hash = null where id = $1', [
    googleOnlyId,
  ]);
  await assert.rejects(
    () => auth.unlinkGoogle(googleOnlyId),
    (e) => e.getStatus?.() === 400,
    'unlink requires password',
  );
  count++;

  console.log(`google oauth auth service: ${count} checks passed`);
} finally {
  await pool.end().catch(() => {});
}