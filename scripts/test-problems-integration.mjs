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
  const email = `phase6-${label}-${randomUUID()}@example.test`;
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

const problemUrl = `https://leetcode.com/problems/two-sum-${randomUUID()}/`;

try {
  await migrate(drizzle({ client: pool }), { migrationsFolder: './drizzle' });
  await migrate(drizzle({ client: pool }), { migrationsFolder: './drizzle' });
  await pool.query(`
    INSERT INTO platforms (slug, name, base_url) VALUES
      ('codeforces', 'Codeforces', 'https://codeforces.com'),
      ('leetcode', 'LeetCode', 'https://leetcode.com'),
      ('codechef', 'CodeChef', 'https://www.codechef.com')
    ON CONFLICT (slug) DO NOTHING
  `);
  await app.init();
  const server = app.getHttpServer();

  const userA = await registerAndLogin(server, 'A');
  const userB = await registerAndLogin(server, 'B');

  const topicA1 = await request(server)
    .post('/topics')
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ name: 'Arrays' })
    .expect(201);
  const topicA2 = await request(server)
    .post('/topics')
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ name: 'Hash Map' })
    .expect(201);

  const topicB = await request(server)
    .post('/topics')
    .set(headers)
    .set('Cookie', userB.cookie)
    .send({ name: 'Arrays' })
    .expect(201);

  const created = await request(server)
    .post('/problems')
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      title: 'Two Sum',
      url: problemUrl,
      topicIds: [topicA1.body.id, topicA2.body.id],
    })
    .expect(201);
  check(created.body.topics.length === 2, 'Create links topics');
  const problemId = created.body.id;

  const byId = await request(server)
    .get(`/problems/${problemId}`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(byId.body.title === 'Two Sum', 'Get by id');
  check(byId.body.status === 'unsolved' && byId.body.solvedAt === null, 'Create unsolved');

  const solvedOnce = await request(server)
    .patch(`/problems/${problemId}`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ status: 'solved' })
    .expect(200);
  check(solvedOnce.body.status === 'solved' && solvedOnce.body.solvedAt, 'Patch solved sets solvedAt');
  const solvedAt1 = solvedOnce.body.solvedAt;

  const solvedTwice = await request(server)
    .patch(`/problems/${problemId}`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ status: 'solved' })
    .expect(200);
  check(
    solvedTwice.body.solvedAt === solvedAt1,
    'Idempotent solved preserves solvedAt',
  );

  const reverted = await request(server)
    .patch(`/problems/${problemId}`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ status: 'unsolved' })
    .expect(200);
  check(
    reverted.body.status === 'unsolved' && reverted.body.solvedAt === null,
    'Revert clears solvedAt',
  );

  await new Promise((resolve) => setTimeout(resolve, 5));

  const solvedAgain = await request(server)
    .patch(`/problems/${problemId}`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ status: 'solved' })
    .expect(200);
  check(
    solvedAgain.body.solvedAt && solvedAgain.body.solvedAt !== solvedAt1,
    'Solve again after revert gets new solvedAt',
  );

  await request(server)
    .patch(`/problems/${problemId}`)
    .set(headers)
    .set('Cookie', userB.cookie)
    .send({ status: 'solved' })
    .expect(404);
  count++;

  const list = await request(server)
    .get('/problems?page=1&pageSize=25')
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(
    list.body.meta.total >= 1 && list.body.items.some((item) => item.id === problemId),
    'List includes owned problem',
  );

  const filtered = await request(server)
    .get(`/problems?topicId=${topicA1.body.id}`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(
    filtered.body.meta.total === 1 && filtered.body.items[0].id === problemId,
    'List topicId filter',
  );

  const untaggedProblem = await request(server)
    .post('/problems')
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      title: 'Standalone Alpha',
      url: `https://example.com/standalone-${randomUUID()}/`,
      topicIds: [],
    })
    .expect(201);

  const taggedLeetcode = await request(server)
    .post('/problems')
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      title: 'Binary Search Walkthrough',
      url: `https://leetcode.com/problems/binary-search-${randomUUID()}/`,
      topicIds: [topicA2.body.id],
      platformProblemId: 'LC-BIN',
    })
    .expect(201);

  const untaggedList = await request(server)
    .get('/problems?untagged=true&pageSize=100')
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(
    untaggedList.body.items.some((p) => p.id === untaggedProblem.body.id),
    'Untagged filter includes orphan problem',
  );

  const platformStatus = await request(server)
    .get('/problems?platform=leetcode&status=unsolved&pageSize=100')
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(
    platformStatus.body.items.some((p) => p.id === taggedLeetcode.body.id),
    'Platform + status filter',
  );

  const searchTopics = await request(server)
    .get(
      `/problems?q=Binary&topicIds=${topicA1.body.id}&topicIds=${topicA2.body.id}&pageSize=100`,
    )
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(
    searchTopics.body.meta.total >= 1 &&
      searchTopics.body.items.some((p) => p.id === taggedLeetcode.body.id),
    'Search q with topicIds any-match',
  );

  const solvedForSort = await request(server)
    .post('/problems')
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      title: 'Sort Target',
      url: `https://example.com/sort-${randomUUID()}/`,
      topicIds: [],
      status: 'solved',
    })
    .expect(201);

  const sorted = await request(server)
    .get('/problems?sort=solvedAt&order=desc&pageSize=100')
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  const sortIds = sorted.body.items.map((p) => p.id);
  const sortIdx = sortIds.indexOf(solvedForSort.body.id);
  check(sortIdx >= 0, 'Sort solvedAt includes solved row');

  await request(server)
    .get('/problems?platform=not-a-real-slug')
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(400);
  count++;

  const paged = await request(server)
    .get('/problems?page=1&pageSize=1')
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(
    paged.body.meta.total >= paged.body.items.length,
    'meta.total consistent with filters',
  );

  await request(server).get('/progress').set(headers).expect(401);
  count++;

  const progressBefore = await request(server)
    .get('/progress')
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(
    progressBefore.body.overall.solved + progressBefore.body.overall.unsolved ===
      progressBefore.body.overall.total,
    'Progress overall counts consistent',
  );

  const topicPr1 = await request(server)
    .post('/topics')
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ name: `Progress A ${randomUUID().slice(0, 8)}` })
    .expect(201);
  const topicPr2 = await request(server)
    .post('/topics')
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ name: `Progress B ${randomUUID().slice(0, 8)}` })
    .expect(201);
  const topicPr3 = await request(server)
    .post('/topics')
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ name: `Progress C ${randomUUID().slice(0, 8)}` })
    .expect(201);
  const topicPrEmpty = await request(server)
    .post('/topics')
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ name: `Progress Empty ${randomUUID().slice(0, 8)}` })
    .expect(201);

  const progressUrl = `https://leetcode.com/problems/progress-${randomUUID()}/`;
  const progressProblem = await request(server)
    .post('/problems')
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      title: 'Progress matrix',
      url: progressUrl,
      topicIds: [topicPr1.body.id, topicPr2.body.id, topicPr3.body.id],
    })
    .expect(201);
  const progressProblemId = progressProblem.body.id;

  const progressBaseline = await request(server)
    .get('/progress')
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(
    progressBaseline.body.overall.total === progressBefore.body.overall.total + 1,
    'Progress overall total increases by one',
  );
  for (const topicId of [topicPr1.body.id, topicPr2.body.id, topicPr3.body.id]) {
    const row = progressBaseline.body.topics.find((t) => t.id === topicId);
    check(row && row.total === 1 && row.solved === 0 && row.percentComplete === 0, 'Topic baseline 1/0');
  }
  const emptyRow = progressBaseline.body.topics.find((t) => t.id === topicPrEmpty.body.id);
  check(
    emptyRow && emptyRow.total === 0 && emptyRow.percentComplete === 0,
    'Empty topic shows 0%',
  );

  await request(server)
    .patch(`/problems/${progressProblemId}`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ status: 'solved' })
    .expect(200);

  const progressSolved = await request(server)
    .get('/progress')
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(
    progressSolved.body.overall.solved === progressBefore.body.overall.solved + 1,
    'Progress overall solved increases after solve',
  );
  for (const topicId of [topicPr1.body.id, topicPr2.body.id, topicPr3.body.id]) {
    const row = progressSolved.body.topics.find((t) => t.id === topicId);
    check(
      row && row.solved === 1 && row.percentComplete === 100,
      'Topic solved percent 100%',
    );
  }

  await request(server)
    .patch(`/problems/${progressProblemId}`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ status: 'unsolved' })
    .expect(200);

  const progressReverted = await request(server)
    .get('/progress')
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  for (const topicId of [topicPr1.body.id, topicPr2.body.id, topicPr3.body.id]) {
    const row = progressReverted.body.topics.find((t) => t.id === topicId);
    check(row && row.solved === 0 && row.percentComplete === 0, 'Revert restores unsolved topic counts');
  }

  await request(server)
    .delete(`/problems/${progressProblemId}`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(204);

  const progressAfterDelete = await request(server)
    .get('/progress')
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(
    progressAfterDelete.body.overall.total === progressBefore.body.overall.total,
    'Delete problem restores overall total',
  );
  for (const topicId of [topicPr1.body.id, topicPr2.body.id, topicPr3.body.id]) {
    const row = progressAfterDelete.body.topics.find((t) => t.id === topicId);
    check(row && row.total === 0 && row.solved === 0, 'Delete problem clears topic totals');
  }

  const progressB = await request(server)
    .get('/progress')
    .set(headers)
    .set('Cookie', userB.cookie)
    .expect(200);
  const progressA2 = await request(server)
    .get('/progress')
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(
    !progressB.body.topics.some((t) => t.id === topicA1.body.id),
    'Progress isolated per account',
  );

  await request(server)
    .get(`/problems/${problemId}`)
    .set(headers)
    .set('Cookie', userB.cookie)
    .expect(404);
  await request(server)
    .patch(`/problems/${problemId}`)
    .set(headers)
    .set('Cookie', userB.cookie)
    .send({ title: 'Hijacked' })
    .expect(404);
  await request(server)
    .delete(`/problems/${problemId}`)
    .set(headers)
    .set('Cookie', userB.cookie)
    .expect(404);
  count += 3;

  await request(server)
    .post('/problems')
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      title: 'Foreign topic',
      url: `https://example.com/${randomUUID()}`,
      topicIds: [topicB.body.id],
    })
    .expect(400);
  count++;

  const dupTopicIds = await request(server)
    .post('/problems')
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      title: 'Dup topic ids',
      url: `https://example.com/dup-topic-ids-${randomUUID()}/`,
      topicIds: [topicA2.body.id, topicA2.body.id],
    })
    .expect(201);
  check(dupTopicIds.body.topics.length === 1, 'Duplicate topicIds in request deduped');

  const dup = await request(server)
    .post('/problems')
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      title: 'Dup',
      url: problemUrl,
      topicIds: [],
    })
    .expect(409);
  check(dup.body.code === 'PROBLEM_URL_IN_USE', 'Duplicate URL → 409');

  const raceUrl = `https://example.com/race-${randomUUID()}`;
  const race = await Promise.allSettled([
    request(server)
      .post('/problems')
      .set(headers)
      .set('Cookie', userA.cookie)
      .send({ title: 'R1', url: raceUrl, topicIds: [] }),
    request(server)
      .post('/problems')
      .set(headers)
      .set('Cookie', userA.cookie)
      .send({ title: 'R2', url: raceUrl, topicIds: [] }),
  ]);
  const raceStatuses = race.map((r) =>
    r.status === 'fulfilled' ? r.value.status : 0,
  );
  check(
    raceStatuses.filter((s) => s === 201).length === 1 &&
      raceStatuses.filter((s) => s === 409).length === 1,
    'Concurrent duplicate URL race',
  );

  const patched = await request(server)
    .patch(`/problems/${problemId}`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ title: 'Two Sum (edited)', topicIds: [topicA1.body.id] })
    .expect(200);
  check(
    patched.body.title === 'Two Sum (edited)' && patched.body.topics.length === 1,
    'Patch title and replace topics',
  );

  const sameUrlOtherUser = await request(server)
    .post('/problems')
    .set(headers)
    .set('Cookie', userB.cookie)
    .send({ title: 'B copy', url: problemUrl, topicIds: [] })
    .expect(201);
  check(sameUrlOtherUser.body.id !== problemId, 'Same URL allowed across users');

  const otherUrl = `https://example.com/other-${randomUUID()}/`;
  const urlChangeTarget = await request(server)
    .post('/problems')
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ title: 'URL target', url: otherUrl, topicIds: [] })
    .expect(201);

  const patchDup = await request(server)
    .patch(`/problems/${urlChangeTarget.body.id}`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ url: problemUrl })
    .expect(409);
  check(patchDup.body.code === 'PROBLEM_URL_IN_USE', 'Patch URL to duplicate → 409');

  await request(server)
    .delete(`/topics/${topicA1.body.id}`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(204);

  const afterTopicDelete = await request(server)
    .get(`/problems/${problemId}`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(
    afterTopicDelete.body.topics.length === 0,
    'Topic delete removes join; problem remains',
  );

  await request(server)
    .delete(`/problems/${problemId}`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(204);

  const afterProblemDelete = await pool.query(
    'select id from problems where id=$1',
    [problemId],
  );
  check(afterProblemDelete.rowCount === 0, 'Delete removes problem row');

  const joinsAfterDelete = await pool.query(
    'select problem_id from problem_topics where problem_id=$1',
    [problemId],
  );
  check(joinsAfterDelete.rowCount === 0, 'Delete removes problem_topics joins');

  const listB = await request(server)
    .get('/problems')
    .set(headers)
    .set('Cookie', userB.cookie)
    .expect(200);
  check(
    listB.body.meta.total >= 1 && listB.body.items.some((p) => p.id === sameUrlOtherUser.body.id),
    'Independent libraries per account',
  );

  await request(server)
    .get('/problems')
    .set(headers)
    .expect(401);
  count++;

  const doc = createApiDocument(app);
  check(
    ['/problems', '/problems/{problemId}', '/progress'].every((path) => path in doc.paths),
    'Swagger documents problem and progress routes',
  );

  console.log(
    `Passed ${count} PostgreSQL/HTTP problems assertions. Users: ${emails.length}.`,
  );
} finally {
  if (emails.length)
    await pool
      .query('delete from users where email=ANY($1::text[])', [emails])
      .catch(() => {});
  await app.close();
  await pool.end();
}