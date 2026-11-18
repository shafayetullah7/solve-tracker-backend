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

try {
  const progress = await request(server)
    .get('/progress')
    .set({ ...headers, Cookie: cookie })
    .expect(200);
  const activity = await request(server)
    .get('/progress/activity?weeks=12')
    .set({ ...headers, Cookie: cookie })
    .expect(200);

  const compare = await request(server)
    .get('/people/demo-topics/compare?weeks=12')
    .set({ ...headers, Cookie: cookie })
    .expect(200);

  check(compare.body.me.solved === progress.body.overall.solved, 'compare me solved');
  check(compare.body.me.total === progress.body.overall.total, 'compare me total');
  check(
    typeof compare.body.me.activeWeeks === 'number',
    'compare me activeWeeks',
  );
  check(Array.isArray(activity.body.weeks), 'activity weeks present');

  const summaryCompare = await request(server)
    .get('/people/demo-summary/compare?weeks=12')
    .set({ ...headers, Cookie: cookie })
    .expect(200);
  check(summaryCompare.body.summaryOnlyTopics === true, 'summary-only topics flag');
  const leaked = JSON.stringify(summaryCompare.body).toLowerCase();
  check(!leaked.includes('private-topic'), 'no private topic names in summary compare');

  const peers = await request(server)
    .get('/discover/compare-peers?weeks=12')
    .set({ ...headers, Cookie: cookie });
  if (peers.status === 200) {
    check(peers.body.mode === 'peers', 'peer compare mode');
    check((peers.body.peerCount ?? 0) >= 5, 'peer count >= 5 when peers compare ok');
  } else {
    check(peers.status === 404, 'peer compare 404 when pool small');
  }

  const benchmark = await request(server)
    .get('/discover/benchmark')
    .set({ ...headers, Cookie: cookie })
    .expect(200);
  if ((benchmark.body.peerCount ?? 0) < 5) {
    check(benchmark.body.peers === null, 'benchmark peers null when k<5');
  } else {
    check(benchmark.body.peers !== null, 'benchmark peers when k>=5');
  }

  const topics = await request(server)
    .get('/people/demo-topics/topics')
    .set({ ...headers, Cookie: cookie })
    .expect(200);
  const topicId = topics.body.items?.[0]?.id;
  check(typeof topicId === 'string', 'public topic id');

  const copy1 = await request(server)
    .post(`/people/demo-topics/topics/${topicId}/copy`)
    .set({ ...headers, Cookie: cookie })
    .expect(201);
  check(copy1.body.added + copy1.body.linked > 0, 'copy first adds or links');

  const copy2 = await request(server)
    .post(`/people/demo-topics/topics/${topicId}/copy`)
    .set({ ...headers, Cookie: cookie })
    .expect(201);
  check(copy2.body.added === 0, 'copy second added zero');

  const shareStats = await request(server)
    .get('/users/me/share-stats?days=30')
    .set({ ...headers, Cookie: cookie })
    .expect(200);
  check(typeof shareStats.body.profileViews === 'number', 'share stats profile views');

  console.log(`DISCOVER compare integration — ${count} checks passed.`);
} finally {
  await app.close();
  await pool.end();
}