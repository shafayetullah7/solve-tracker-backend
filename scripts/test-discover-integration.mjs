import 'reflect-metadata';
import 'dotenv/config';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import request from 'supertest';
import { Test } from '@nestjs/testing';
import { authTestEnvironment } from '../test/auth-env.ts';

const target = process.env.TEST_DATABASE_URL;
if (!target || !new URL(target).pathname.endsWith('_test')) {
  throw new Error('Provide TEST_DATABASE_URL ending in _test.');
}

const headers = {
  Origin: 'http://localhost:3001',
  'X-Requested-With': 'practice',
};

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let count = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  count++;
};

function collectHandles(body) {
  const handles = new Set();
  const walk = (value) => {
    if (!value || typeof value !== 'object') return;
    if (typeof value.handle === 'string') handles.add(value.handle.toLowerCase());
    if (Array.isArray(value)) value.forEach(walk);
    else Object.values(value).forEach(walk);
  };
  walk(body);
  return handles;
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

  const seedDemo = spawnSync('pnpm', ['db:seed:discover-demo'], {
    cwd: backendRoot,
    env: process.env,
    stdio: 'inherit',
  });
  if (seedDemo.status !== 0) throw new Error('discover demo seed failed');

  const seedBase = spawnSync('pnpm', ['db:seed'], {
    cwd: backendRoot,
    env: process.env,
    stdio: 'inherit',
  });
  if (seedBase.status !== 0) throw new Error('base seed failed');

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

try {
  const forYou = await request(server)
    .get('/discover/for-you')
    .set({ ...headers, Cookie: cookie })
    .expect(200);

  const handles = collectHandles(forYou.body);
  check(!handles.has('demo-private'), 'private user not in for-you');
  check(!handles.has('demo-trap'), 'trap private not in rails scan');

  const starterInRails = (forYou.body.rails ?? []).some((rail) =>
  rail.people?.some((p) => p.handle === 'starter'),
  );
  check(!starterInRails, 'starter not in rails');
  check(
    (forYou.body.starterLists ?? []).some((s) => s.handle === 'starter'),
    'starter in starterLists',
  );

  const search = await request(server)
    .get('/discover/search?q=demo-summary&limit=10')
    .set({ ...headers, Cookie: cookie })
    .expect(200);
  check(
    search.body.items?.some((i) => i.handle === 'demo-summary'),
    'search finds demo-summary',
  );

  const searchCase = await request(server)
    .get('/discover/search?q=Demo-Sum&limit=10')
    .set({ ...headers, Cookie: cookie })
    .expect(200);
  check(searchCase.body.items?.length >= 1, 'search case-insensitive');

  const events = await request(server)
    .post('/discover/events')
    .set({ ...headers, Cookie: cookie })
    .send({ events: [{ event: 'discover_open', surface: 'test' }] })
    .expect(201);
  check(events.body.accepted === 1, 'events accepted');

  await request(server)
    .post('/discover/events')
    .set({ ...headers, Cookie: cookie })
    .send({ events: [{ event: 'not_real', surface: 'test' }] })
    .expect(400);

  const topicsDir = await request(server)
    .get('/discover/topics')
    .set({ ...headers, Cookie: cookie })
    .expect(200);
  check(Array.isArray(topicsDir.body.yourTopics), 'topics directory yourTopics');

  const dpKey = encodeURIComponent('dynamic programming');
  const hub = await request(server)
    .get(`/discover/topics/${dpKey}`)
    .set({ ...headers, Cookie: cookie })
    .expect(200);
  check(hub.body.normalizedName === 'dynamic programming', 'hub dp normalized name');
  check(
    (hub.body.lists ?? []).some((l) => l.handle === 'demo-topics'),
    'hub lists include demo-topics',
  );

  const exclude = await request(server)
    .get(`/discover/topics/${dpKey}/problems?excludeMine=true`)
    .set({ ...headers, Cookie: cookie })
    .expect(200);
  check(Array.isArray(exclude.body.items), 'hub problems excludeMine');

  await request(server)
    .get('/discover/problems/00000000-0000-4000-8000-000000000099/community')
    .set({ ...headers, Cookie: cookie })
    .expect(404);
  check(true, 'community 404 for foreign problem');

  const hints = await request(server)
    .get('/discover/topic-hints')
    .set({ ...headers, Cookie: cookie })
    .expect(200);
  check(Array.isArray(hints.body.items), 'topic hints');

  console.log(`DISCOVER integration — ${count} checks passed.`);
} finally {
  await app.close();
  await pool.end();
}