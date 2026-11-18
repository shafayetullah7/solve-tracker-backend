import 'reflect-metadata';
import 'dotenv/config';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq, sql } from 'drizzle-orm';
import request from 'supertest';
import { Test } from '@nestjs/testing';
import { authTestEnvironment } from '../test/auth-env.ts';
import { userFollows, users } from '../dist/database/schema/index.js';
import { and, eq as drizzleEq } from 'drizzle-orm';

const target = process.env.TEST_DATABASE_URL;
if (!target || !new URL(target).pathname.endsWith('_test')) {
  throw new Error('Provide TEST_DATABASE_URL ending in _test.');
}

const headers = {
  Origin: 'http://localhost:3001',
  'X-Requested-With': 'practice',
};

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function check(condition, label) {
  assert.ok(condition, label);
}

async function login(server, email, password) {
  const res = await request(server)
    .post('/auth/login')
    .set(headers)
    .send({ email, password })
    .expect(200);
  return res.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ');
}

async function bootstrap() {
  Object.assign(process.env, authTestEnvironment, {
    NODE_ENV: 'test',
    DATABASE_URL: target,
    PORT: '3000',
    HOST: '127.0.0.1',
    SWAGGER_ENABLED: 'true',
    DISCOVER_MODE: 'full',
  });

  const pool = new pg.Pool({ connectionString: target });
  await migrate(drizzle({ client: pool }), { migrationsFolder: './drizzle' });

  for (const cmd of ['db:seed:discover-demo', 'db:seed']) {
    const seed = spawnSync('pnpm', [cmd], {
      cwd: backendRoot,
      env: process.env,
      stdio: 'inherit',
    });
    if (seed.status !== 0) throw new Error(`${cmd} failed`);
  }

  const { AppModule } = await import('../dist/app.module.js');
  const { configureApp } = await import('../dist/configure-app.js');
  const { EmailService } = await import('../dist/modules/email/email.service.js');

  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(EmailService)
    .useValue({ sendReset: async () => {} })
    .compile();

  const app = module.createNestApplication();
  configureApp(app);
  await app.init();
  const server = app.getHttpServer();
  const cookie = await login(
    server,
    'demo-viewer@discover.test',
    'demo-password-1',
  );

  return { app, server, cookie, pool };
}

const { server, cookie, app, pool } = await bootstrap();
const db = drizzle({ client: pool });

try {
  await request(server)
    .put('/people/demo-summary/follow')
    .set({ ...headers, Cookie: cookie })
    .expect(204);
  await request(server)
    .put('/people/demo-summary/follow')
    .set({ ...headers, Cookie: cookie })
    .expect(204);

  const viewerRow = await db
    .select({ id: users.id })
    .from(users)
    .where(drizzleEq(users.handle, 'demo-viewer'))
    .limit(1);
  const summaryRow = await db
    .select({ id: users.id })
    .from(users)
    .where(drizzleEq(users.handle, 'demo-summary'))
    .limit(1);
  const pair = await db
    .select()
    .from(userFollows)
    .where(
      and(
        drizzleEq(userFollows.followerId, viewerRow[0].id),
        drizzleEq(userFollows.followeeId, summaryRow[0].id),
      ),
    );
  check(pair.length === 1, 'idempotent follow leaves one row');

  const following = await request(server)
    .get('/users/me/following?page=1')
    .set({ ...headers, Cookie: cookie })
    .expect(200);
  check(
    following.body.items?.some((i) => i.handle === 'demo-summary'),
    'following list includes demo-summary',
  );

  const header = await request(server)
    .get('/people/demo-summary')
    .set({ ...headers, Cookie: cookie })
    .expect(200);
  check(header.body.viewerFollows === true, 'header viewerFollows true');

  await request(server)
    .put('/people/demo-private/follow')
    .set({ ...headers, Cookie: cookie })
    .expect(404);

  const railBefore = await request(server)
    .get('/discover/people?rail=following')
    .set({ ...headers, Cookie: cookie })
    .expect(200);
  check(
    railBefore.body.items?.some((i) => i.handle === 'demo-summary'),
    'following rail lists demo-summary',
  );

  await db
    .update(users)
    .set({ practiceVisibility: 'private' })
    .where(eq(users.handle, 'demo-summary'));

  const railAfter = await request(server)
    .get('/discover/people?rail=following')
    .set({ ...headers, Cookie: cookie })
    .expect(200);
  check(
    !railAfter.body.items?.some((i) => i.handle === 'demo-summary'),
    'following rail omits private followee',
  );

  const followingAfter = await request(server)
    .get('/users/me/following?page=1')
    .set({ ...headers, Cookie: cookie })
    .expect(200);
  check(
    !followingAfter.body.items?.some((i) => i.handle === 'demo-summary'),
    'GET following omits private followee but row kept',
  );

  const summaryCookie = await login(
    server,
    'demo-summary@discover.test',
    'demo-password-1',
  );
  const beforeCount = await request(server)
    .get('/users/me/followers/count')
    .set({ ...headers, Cookie: summaryCookie })
    .expect(200);
  check(typeof beforeCount.body.count === 'number', 'followers count shape');

  await db
    .update(users)
    .set({ practiceVisibility: 'summary' })
    .where(eq(users.handle, 'demo-summary'));

  await request(server)
    .put('/people/demo-summary/follow')
    .set({ ...headers, Cookie: cookie })
    .expect(204);

  const afterCount = await request(server)
    .get('/users/me/followers/count')
    .set({ ...headers, Cookie: summaryCookie })
    .expect(200);
  check(afterCount.body.count >= beforeCount.body.count, 'followers count increments');

  await request(server)
    .delete('/people/demo-summary/follow')
    .set({ ...headers, Cookie: cookie })
    .expect(204);

  console.log('test-discover-follow-integration OK');
} finally {
  await app.close();
  await pool.end();
}