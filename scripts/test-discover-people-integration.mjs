import 'reflect-metadata';
import 'dotenv/config';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { authTestEnvironment } from '../test/auth-env.ts';

const target = process.env.TEST_DATABASE_URL;
if (!target || !new URL(target).pathname.endsWith('_test'))
  throw new Error(
    'Provide a dedicated TEST_DATABASE_URL ending in _test.',
  );

const headers = {
  Origin: 'http://localhost:3001',
  'X-Requested-With': 'practice',
};

const FORBIDDEN_KEY_PATTERN =
  /^(email|notes|userId|password|createdAt|updatedAt|solvedAt)$/;

function collectKeys(value, prefix = '') {
  const keys = [];
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${key}` : key;
      keys.push(path);
      keys.push(...collectKeys(child, path));
    }
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      keys.push(...collectKeys(item, `${prefix}[${index}]`));
    });
  }
  return keys;
}

function assertNoForbiddenKeys(body, label) {
  for (const path of collectKeys(body)) {
    const leaf = path.split('.').pop()?.replace(/\[\d+\]$/, '') ?? path;
    assert.ok(
      !FORBIDDEN_KEY_PATTERN.test(leaf),
      `${label}: forbidden key ${path}`,
    );
  }
}

let count = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  count++;
};

async function login(server, email, password) {
  const login = await request(server)
    .post('/auth/login')
    .set(headers)
    .send({ email, password })
    .expect(200);
  return login.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ');
}

const backendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

async function bootstrapDiscoverApp(discoverMode) {
  Object.assign(process.env, authTestEnvironment, {
    NODE_ENV: 'test',
    DATABASE_URL: target,
    PORT: '3000',
    HOST: '127.0.0.1',
    SWAGGER_ENABLED: 'true',
    DISCOVER_MODE: discoverMode,
  });

  const pool = new pg.Pool({ connectionString: target });
  await migrate(drizzle({ client: pool }), { migrationsFolder: './drizzle' });
  const seed = spawnSync(
    'pnpm',
    ['db:seed:discover-demo'],
    { cwd: backendRoot, env: process.env, stdio: 'inherit' },
  );
  if (seed.status !== 0) throw new Error('discover demo seed failed');

  const { AppModule } = await import('../dist/app.module.js');
  const { configureApp } = await import('../dist/configure-app.js');
  const { EmailService } = await import('../dist/modules/email/email.service.js');

  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(EmailService)
    .useValue({ sendReset: async () => {} })
    .compile();
  const app = module.createNestApplication({ logger: false });
  configureApp(app, true);
  await app.init();
  return { app, pool, server: app.getHttpServer() };
}

if (process.env.DISCOVER_SHARING_ONLY === '1') {
  const sharing = await bootstrapDiscoverApp('sharing');
  try {
    const summaryCookie = await login(
      sharing.server,
      'demo-summary@discover.test',
      'demo-password-1',
    );
    await request(sharing.server)
      .get('/people/demo-summary')
      .set(headers)
      .set('Cookie', summaryCookie)
      .expect(200);
    await request(sharing.server)
      .get('/people/demo-topics')
      .set(headers)
      .set('Cookie', summaryCookie)
      .expect(404);
    console.log('Sharing mode checks passed.');
  } finally {
    await sharing.app.close();
    await sharing.pool.end();
  }
  process.exit(0);
}

const { app, pool, server } = await bootstrapDiscoverApp('full');

try {
  const viewerCookie = await login(
    server,
    'demo-viewer@discover.test',
    'demo-password-1',
  );

  const privateRes = await request(server)
    .get('/people/demo-private')
    .set(headers)
    .set('Cookie', viewerCookie)
    .expect(404);
  const unknownRes = await request(server)
    .get('/people/no-such-handle')
    .set(headers)
    .set('Cookie', viewerCookie)
    .expect(404);
  check(
    JSON.stringify(privateRes.body) === JSON.stringify(unknownRes.body),
    'private and unknown 404 bodies identical',
  );
  check(privateRes.body.code === 'PROFILE_NOT_FOUND', 'PROFILE_NOT_FOUND code');

  const topicsUserId = (
    await pool.query(`select id from users where handle = 'demo-topics' limit 1`)
  ).rows[0]?.id;
  const counterBefore = await pool.query(
    `select coalesce(sum(views), 0)::int as views from discover_daily_counters where subject_type = 'profile' and subject_id = $1::uuid`,
    [topicsUserId],
  );
  const viewsBefore = counterBefore.rows[0]?.views ?? 0;
  await request(server)
    .get('/people/demo-topics')
    .set(headers)
    .set('Cookie', viewerCookie)
    .expect(200);
  await request(server)
    .get('/people/demo-topics')
    .set(headers)
    .set('Cookie', viewerCookie)
    .expect(200);
  const counterAfter = await pool.query(
    `select coalesce(sum(views), 0)::int as views from discover_daily_counters where subject_type = 'profile' and subject_id = $1::uuid`,
    [topicsUserId],
  );
  check(
    (counterAfter.rows[0]?.views ?? 0) === viewsBefore + 1,
    'profile view counted once per viewer per day',
  );

  const summaryRes = await request(server)
    .get('/people/Demo-Summary')
    .set(headers)
    .set('Cookie', viewerCookie)
    .expect(200);
  check(summaryRes.body.handle === 'demo-summary', 'case-insensitive handle');
  assertNoForbiddenKeys(summaryRes.body, 'profile summary');
  const allowedProfile = new Set([
    'handle',
    'name',
    'bio',
    'practiceGoal',
    'overall',
    'streak',
    'platforms',
    'practicingSince',
    'avatarUrl',
    'viewerFollows',
  ]);
  for (const key of Object.keys(summaryRes.body)) {
    check(allowedProfile.has(key), `profile key allowed: ${key}`);
  }

  await request(server)
    .get('/people/demo-summary/topics')
    .set(headers)
    .set('Cookie', viewerCookie)
  .expect(404);

  const topicsRes = await request(server)
    .get('/people/demo-topics/topics')
    .set(headers)
    .set('Cookie', viewerCookie)
    .expect(200);
  assertNoForbiddenKeys(topicsRes.body, 'topics board');
  const publicRow = topicsRes.body.items.find((r) => r.name === 'DP');
  const privateRow = topicsRes.body.items.find((r) => r.name === 'Strings');
  check(publicRow?.isPublic === true && publicRow?.id, 'public topic has id');
  check(privateRow?.isPublic === false && !privateRow?.id, 'private topic hides id');

  const headerRes = await request(server)
    .get(`/people/demo-topics/topics/${publicRow.id}`)
    .set(headers)
    .set('Cookie', viewerCookie)
    .expect(200);
  check(
    headerRes.body.difficultyHistogram.length === 6,
    'histogram has six buckets',
  );

  const problemsRes = await request(server)
    .get(
      `/people/demo-topics/topics/${publicRow.id}/problems?page=1&pageSize=50`,
    )
    .set(headers)
    .set('Cookie', viewerCookie)
    .expect(200);
  check(problemsRes.body.meta.pageSize === 50, 'default page size 50');
  const twoSum = problemsRes.body.items.find((r) => r.title === 'Two Sum');
  check(twoSum?.inViewerLibrary === true, 'inViewerLibrary via normalized_url');
  assertNoForbiddenKeys(problemsRes.body, 'public problems');

  let lastStatus = 200;
  for (let i = 0; i < 122; i++) {
    const res = await request(server)
      .get('/people/demo-summary/activity?weeks=4')
      .set(headers)
      .set('Cookie', viewerCookie);
    lastStatus = res.status;
    if (lastStatus === 429) break;
  }
  check(lastStatus === 429, 'rate limit returns 429');
  check(
    (await request(server)
      .get('/people/demo-summary/activity?weeks=4')
      .set(headers)
      .set('Cookie', viewerCookie)).body.code === 'RATE_LIMITED',
    '429 uses standard error schema',
  );

  console.log(`Discover people integration: ${count} assertions passed.`);
} finally {
  await app.close();
  await pool.end();
}

const sharingChild = spawnSync(
  process.execPath,
  ['scripts/test-discover-people-integration.mjs'],
  {
    cwd: backendRoot,
    env: { ...process.env, DISCOVER_SHARING_ONLY: '1' },
    stdio: 'inherit',
  },
);
if (sharingChild.status !== 0) {
  throw new Error('discover sharing-mode integration failed');
}