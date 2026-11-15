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
import { EmailService } from '../dist/modules/email/email.service.js';

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
const { configureApp, createApiDocument } = await import('../dist/configure-app.js');

const headers = {
  Origin: 'http://localhost:3001',
  'X-Requested-With': 'practice',
};

const emails = [];
let count = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  count++;
};

async function registerAndLogin(server, label) {
  const email = `phase5-${label}-${randomUUID()}@example.test`;
  const password = 'a long testing passphrase 🌱';
  emails.push(email);
  await request(server)
    .post('/auth/register')
    .set(headers)
    .send({ name: `User ${label}`, email, password })
    .expect(201);
  const login = await request(server)
    .post('/auth/login')
    .set(headers)
    .send({ email, password })
    .expect(200);
  const cookie = login.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ');
  return { email, cookie };
}

const module = await Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(EmailService)
  .useValue({ sendReset: async () => {} })
  .compile();
const app = module.createNestApplication({ logger: false });
configureApp(app, true);

try {
  await migrate(drizzle({ client: pool }), { migrationsFolder: './drizzle' });
  await migrate(drizzle({ client: pool }), { migrationsFolder: './drizzle' });
  await app.init();
  const server = app.getHttpServer();

  const userA = await registerAndLogin(server, 'A');
  const userB = await registerAndLogin(server, 'B');

  const createdA = await request(server)
    .post('/topics')
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ name: '  Monotonic Stack  ' })
    .expect(201);
  check(createdA.body.name === 'Monotonic Stack', 'Create trims display name');
  const topicAId = createdA.body.id;

  const createdB = await request(server)
    .post('/topics')
    .set(headers)
    .set('Cookie', userB.cookie)
    .send({ name: 'monotonic stack' })
    .expect(201);
  check(createdB.body.id !== topicAId, 'Same display name allowed across users');

  const listB = await request(server)
    .get('/topics?page=1&pageSize=25')
    .set(headers)
    .set('Cookie', userB.cookie)
    .expect(200);
  check(
    listB.body.meta.total === 1 &&
      listB.body.items[0].id === createdB.body.id &&
      !listB.body.items.some((item) => item.id === topicAId),
    'Independent topic libraries per account',
  );

  const duplicate = await request(server)
    .post('/topics')
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ name: 'MONOTONIC STACK' })
    .expect(409);
  check(
    duplicate.body.code === 'TOPIC_NAME_IN_USE' &&
      typeof duplicate.body.message === 'string' &&
      duplicate.body.message.length > 0,
    'Duplicate normalized name → 409 with message',
  );

  const listA = await request(server)
    .get('/topics?page=1&pageSize=25')
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(
    listA.body.meta.total === 1 && listA.body.items[0].id === topicAId,
    'List pagination meta for owner',
  );

  await request(server)
    .patch(`/topics/${topicAId}`)
    .set(headers)
    .set('Cookie', userB.cookie)
    .send({ name: 'Hijacked' })
    .expect(404);

  await request(server)
    .delete(`/topics/${topicAId}`)
    .set(headers)
    .set('Cookie', userB.cookie)
    .expect(404);
  count += 2;

  const renamed = await request(server)
    .patch(`/topics/${topicAId}`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ name: 'Stacks' })
    .expect(200);
  check(renamed.body.name === 'Stacks', 'Rename updates display name');

  const secondA = await request(server)
    .post('/topics')
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ name: 'Graphs' })
    .expect(201);

  const renameDup = await request(server)
    .patch(`/topics/${secondA.body.id}`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ name: 'stacks' })
    .expect(409);
  check(renameDup.body.code === 'TOPIC_NAME_IN_USE', 'Rename duplicate within account → 409');

  const sharedName = `Race-${randomUUID()}`;
  const race = await Promise.allSettled([
    request(server)
      .post('/topics')
      .set(headers)
      .set('Cookie', userA.cookie)
      .send({ name: sharedName }),
    request(server)
      .post('/topics')
      .set(headers)
      .set('Cookie', userA.cookie)
      .send({ name: sharedName }),
  ]);
  const raceStatuses = race.map((r) =>
    r.status === 'fulfilled' ? r.value.status : 0,
  );
  check(
    raceStatuses.filter((s) => s === 201).length === 1 &&
      raceStatuses.filter((s) => s === 409).length === 1,
    'Concurrent duplicate create → one success, one 409',
  );

  await request(server)
    .delete(`/topics/${secondA.body.id}`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(204);

  await request(server)
    .delete(`/topics/${topicAId}`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(204);

  const afterDelete = await pool.query('select id from topics where id=$1', [
    topicAId,
  ]);
  check(afterDelete.rowCount === 0, 'Delete removes topic row');

  await request(server)
    .get('/topics')
    .set(headers)
    .expect(401);
  count++;

  const doc = createApiDocument(app);
  check(
    ['/topics', '/topics/{topicId}'].every((path) => path in doc.paths),
    'Swagger documents topic collection and by-id routes',
  );

  console.log(
    `Passed ${count} PostgreSQL/HTTP topics assertions. Users: ${emails.length}.`,
  );
  console.log(
    'Phase 6 note: topic delete with linked problems is covered in scripts/test-problems-integration.mjs.',
  );
} finally {
  if (emails.length)
    await pool
      .query('delete from users where email=ANY($1::text[])', [emails])
      .catch(() => {});
  await app.close();
  await pool.end();
}