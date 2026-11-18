import 'reflect-metadata';
import 'dotenv/config';
import assert from 'node:assert/strict';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { authTestEnvironment } from '../test/auth-env.ts';
import { AUTH_PROVIDER_GOOGLE } from '../dist/modules/auth/auth-providers.js';

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
const { AuthProviderIdentityRepository } = await import(
  '../dist/modules/auth/auth-provider-identity.repository.js'
);

let count = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  count++;
};

try {
  await migrate(drizzle({ client: pool }), { migrationsFolder: './drizzle' });
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = module.createNestApplication({ logger: false });
  await app.init();
  const identities = module.get(AuthProviderIdentityRepository);
  const userId = randomUUID();
  const passwordUserId = randomUUID();
  const subject = `google-sub-${randomUUID()}`;
  const email = `oauth-${randomUUID()}@example.test`;

  await pool.query(
    `INSERT INTO users (id, name, email, password_hash) VALUES ($1, $2, $3, $4)`,
    [passwordUserId, 'Password User', `pw-${randomUUID()}@example.test`, '$argon2id$v=19$m=19456,t=2,p=1$dummy'],
  );
  await pool.query(
    `INSERT INTO users (id, name, email, password_hash) VALUES ($1, $2, $3, NULL)`,
    [userId, 'Google Only', `go-${randomUUID()}@example.test`],
  );

  const row = await identities.create({
    userId,
    provider: AUTH_PROVIDER_GOOGLE,
    providerSubject: subject,
    providerEmail: email,
  });
  check(row.id && row.userId === userId, 'create identity');

  const found = await identities.findByProviderSubject(AUTH_PROVIDER_GOOGLE, subject);
  check(found?.providerEmail === email, 'findByProviderSubject');

  const byUser = await identities.findByUserAndProvider(userId, AUTH_PROVIDER_GOOGLE);
  check(byUser?.id === row.id, 'findByUserAndProvider');

  const listed = await identities.listByUserId(userId);
  check(listed.length === 1, 'listByUserId');

  const updatedEmail = `updated-${email}`;
  const upserted = await identities.upsertByProviderSubject({
    userId,
    provider: AUTH_PROVIDER_GOOGLE,
    providerSubject: subject,
    providerEmail: updatedEmail,
  });
  check(upserted.id === row.id && upserted.providerEmail === updatedEmail, 'upsert updates email');

  const otherSubject = `google-sub-${randomUUID()}`;
  let duplicateBlocked = false;
  try {
    await identities.create({
      userId: passwordUserId,
      provider: AUTH_PROVIDER_GOOGLE,
      providerSubject: subject,
      providerEmail: 'other@example.test',
    });
  } catch {
    duplicateBlocked = true;
  }
  check(duplicateBlocked, 'unique provider+subject');

  await identities.deleteByUserAndProvider(userId, AUTH_PROVIDER_GOOGLE);
  check(
    !(await identities.findByUserAndProvider(userId, AUTH_PROVIDER_GOOGLE)),
    'deleteByUserAndProvider',
  );

  await identities.create({
    userId,
    provider: AUTH_PROVIDER_GOOGLE,
    providerSubject: otherSubject,
    providerEmail: email,
  });
  await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  const afterCascade = await pool.query(
    'SELECT 1 FROM auth_provider_identities WHERE provider_subject = $1',
    [otherSubject],
  );
  check(afterCascade.rowCount === 0, 'cascade delete on user');

  console.log(`auth provider identities: ${count} checks passed`);
} finally {
  await pool.end().catch(() => {});
}