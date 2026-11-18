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
import { DISCOVER_EVENT_NAMES } from '../dist/modules/discover/discover.config.js';

const target = process.env.TEST_DATABASE_URL;
if (!target || !new URL(target).pathname.endsWith('_test')) {
  throw new Error('Provide TEST_DATABASE_URL ending in _test.');
}

const headers = {
  Origin: 'http://localhost:3001',
  'X-Requested-With': 'practice',
};

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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
  const accepted = await request(server)
    .post('/discover/events')
    .set({ ...headers, Cookie: cookie })
    .send({
      events: [
        { event: 'discover_open', surface: 'test' },
        { event: 'discover_compare_open', surface: 'test' },
      ],
    })
    .expect(201);
  assert.equal(accepted.body.accepted, 2, 'batch accepted');

  await request(server)
    .post('/discover/events')
    .set({ ...headers, Cookie: cookie })
    .send({ events: [{ event: 'not_real', surface: 'test' }] })
    .expect(400);

  const { rows } = await pool.query(
    `SELECT event FROM discover_events WHERE event = ANY($1::text[]) ORDER BY created_at DESC LIMIT 20`,
    [DISCOVER_EVENT_NAMES],
  );
  const seen = new Set(rows.map((r) => r.event));
  assert.ok(seen.has('discover_open'), 'discover_open persisted');

  console.log(`DISCOVER events integration — ${rows.length} recent rows, OK`);
} finally {
  await app.close();
  await pool.end();
}