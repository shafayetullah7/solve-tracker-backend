import 'reflect-metadata';
import 'dotenv/config';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { Test } from '@nestjs/testing';
import { authTestEnvironment } from '../test/auth-env.ts';
import { users } from '../dist/database/schema/index.js';

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
  return { app, server: app.getHttpServer(), pool };
}

const { server, app, pool } = await bootstrap();
const db = drizzle({ client: pool });

try {
  await request(server).get('/public/people/demo-summary').expect(404);

  await db
    .update(users)
    .set({ publicWeb: true })
    .where(eq(users.handle, 'demo-summary'));

  const pub = await request(server)
    .get('/public/people/demo-summary')
    .expect(200);
  check(pub.body.handle === 'demo-summary', 'public profile when opted in');
  const body = JSON.stringify(pub.body);
  check(!body.includes('viewerFollows'), 'no viewerFollows');
  check(!body.toLowerCase().includes('discover.test'), 'no email in public payload');

  const cookie = await login(
    server,
    'demo-viewer@discover.test',
    'demo-password-1',
  );

  await request(server)
    .put('/people/demo-summary/block')
    .set({ ...headers, Cookie: cookie })
    .expect(204);

  await request(server)
    .get('/people/demo-summary')
    .set({ ...headers, Cookie: cookie })
    .expect(404);

  const search = await request(server)
    .get('/discover/search?q=demo-summary&limit=10')
    .set({ ...headers, Cookie: cookie })
    .expect(200);
  check(
    !search.body.items?.some((i) => i.handle === 'demo-summary'),
    'blocked user omitted from search',
  );

  await request(server)
    .post('/discover/reports')
    .set({ ...headers, Cookie: cookie })
    .send({ handle: 'demo-topics', reason: 'test report integration' })
    .expect(201);

  console.log('test-discover-public-integration OK');
} finally {
  await app.close();
  await pool.end();
}