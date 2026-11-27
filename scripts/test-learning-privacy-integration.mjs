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
if (!target || !new URL(target).pathname.endsWith('_test')) {
  throw new Error('Provide TEST_DATABASE_URL ending in _test.');
}

Object.assign(process.env, authTestEnvironment, {
  NODE_ENV: 'test',
  DATABASE_URL: target,
  PORT: '3000',
  HOST: '127.0.0.1',
  SWAGGER_ENABLED: 'true',
  DISCOVER_MODE: 'full',
});

const headers = {
  Origin: 'http://localhost:3001',
  'X-Requested-With': 'practice',
};

const MARKER_TITLE = 'PRIVACY_MARKER_GUIDE_TITLE';
const MARKER_BODY = 'PRIVACY_MARKER_NODE_BODY_PHRASE';

const FORBIDDEN_KEY_PATTERN =
  /^(guideId|nodeId|enrollmentId|attemptId|assessmentId|importId|structureRevision|contentRevision|answerKey|grading|resumeNodeId)$/i;

let count = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  count++;
};

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

function assertNoNeedles(body, needles, label) {
  const text = JSON.stringify(body ?? {});
  for (const needle of needles) {
    if (needle && text.includes(needle)) {
      throw new Error(`${label}: leaked needle ${needle}`);
    }
  }
}

function scanResponse(body, needles, label) {
  assertNoForbiddenKeys(body, label);
  assertNoNeedles(body, needles, label);
}

function scanAndCheck(body, needles, label) {
  scanResponse(body, needles, label);
  check(true, `${label}: no learning needles or forbidden keys`);
}

async function register(server, label, handle) {
  const email = `privacy-${label}-${randomUUID()}@example.test`;
  const password = 'a long testing passphrase 🌱';
  await request(server)
    .post('/auth/register')
    .set(headers)
    .send({ name: `Privacy ${label}`, email, password, handle })
    .expect(201);
  const login = await request(server)
    .post('/auth/login')
    .set(headers)
    .send({ email, password })
    .expect(200);
  const cookie = login.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ');
  return { email, cookie, handle };
}

const pool = new pg.Pool({ connectionString: target });
const { AppModule } = await import('../dist/app.module.js');
const { configureApp } = await import('../dist/configure-app.js');

const module = await Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(EmailService)
  .useValue({ sendReset: async () => {} })
  .compile();
const app = module.createNestApplication({ logger: false });
configureApp(app, true);

const emails = [];

try {
  await migrate(drizzle({ client: pool }), { migrationsFolder: './drizzle' });
  await app.init();
  const server = app.getHttpServer();

  const ownerHandle = `privacy_own_${randomUUID().replace(/-/g, '').slice(0, 10)}`;
  const owner = await register(server, 'owner', ownerHandle);
  emails.push(owner.email);
  const viewer = await register(server, 'viewer', `privacy_view_${randomUUID().replace(/-/g, '').slice(0, 10)}`);
  emails.push(viewer.email);

  const publicProfile = await request(server)
    .patch('/users/me/profile')
    .set(headers)
    .set('Cookie', owner.cookie)
    .send({ practiceVisibility: 'summary', publicWeb: true })
    .expect(200);
  check(publicProfile.body.publicWeb === true, 'Owner enables public web');
  check(publicProfile.body.practiceVisibility === 'summary', 'Owner sharing summary visibility');

  const needles = [MARKER_TITLE, MARKER_BODY];
  let guideId;
  let nodeId;
  let assessmentId;
  let attemptId;
  let resumeNodeId;
  let backlinkProblemId;

  const guideOp = randomUUID();
  const guideRes = await request(server)
    .post('/learning/guides')
    .set(headers)
    .set('Cookie', owner.cookie)
    .send({ title: MARKER_TITLE, description: 'Privacy seed', operationId: guideOp })
    .expect(201);
  guideId = guideRes.body.resourceId;
  needles.push(guideId);
  check(!!guideId, 'Guide seeded with marker title');

  const tree = await request(server)
    .get(`/learning/guides/${guideId}/tree`)
    .set(headers)
    .set('Cookie', owner.cookie)
    .expect(200);
  const structureRevision = tree.body.structureRevision;

  const nodeRes = await request(server)
    .post(`/learning/guides/${guideId}/nodes`)
    .set(headers)
    .set('Cookie', owner.cookie)
    .send({
      title: 'Privacy step',
      parentId: null,
      beforeNodeId: null,
      expectedStructureRevision: structureRevision,
      operationId: randomUUID(),
    })
    .expect(201);
  nodeId = nodeRes.body.resourceId;
  needles.push(nodeId);
  check(!!nodeId, 'Guide node seeded');

  const tree2 = await request(server)
    .get(`/learning/guides/${guideId}/tree`)
    .set(headers)
    .set('Cookie', owner.cookie)
    .expect(200);
  const nodeRow = tree2.body.nodes.find((n) => n.id === nodeId);

  await request(server)
    .put(`/learning/guides/${guideId}/nodes/${nodeId}/content`)
    .set(headers)
    .set('Cookie', owner.cookie)
    .send({
      expectedContentRevision: nodeRow.contentRevision,
      operationId: randomUUID(),
      blocks: [{ type: 'text', payload: { body: MARKER_BODY } }],
    })
    .expect(200);

  const enrollment = await request(server)
    .get(`/learning/guides/${guideId}/enrollment`)
    .set(headers)
    .set('Cookie', owner.cookie)
    .expect(200);
  resumeNodeId = enrollment.body.resumeNodeId;
  if (resumeNodeId) needles.push(resumeNodeId);
  check(enrollment.body.guideId === guideId, 'Enrollment scoped to seeded guide (owner only)');

  const correctOptionId = randomUUID();
  const assessRes = await request(server)
    .post(`/learning/guides/${guideId}/assessments`)
    .set(headers)
    .set('Cookie', owner.cookie)
    .send({ title: 'Privacy quiz', operationId: randomUUID() })
    .expect(201);
  assessmentId = assessRes.body.id;
  needles.push(assessmentId);
  check(!!assessmentId, 'Assessment seeded on guide');

  await request(server)
    .post(`/learning/guides/${guideId}/assessments/${assessmentId}/questions`)
    .set(headers)
    .set('Cookie', owner.cookie)
    .send({
      kind: 'single_choice',
      prompt: {
        stem: 'One',
        options: [
          { id: correctOptionId, label: 'Yes' },
          { id: randomUUID(), label: 'No' },
        ],
      },
      gradingConfig: { correctOptionId },
      points: 1,
      operationId: randomUUID(),
    })
    .expect(201);

  const publishOp = randomUUID();
  await request(server)
    .post(`/learning/guides/${guideId}/assessments/${assessmentId}/revisions`)
    .set(headers)
    .set('Cookie', owner.cookie)
    .send({ passingBasisPoints: 5000, operationId: publishOp })
    .expect(201);
  await request(server)
    .post(`/learning/guides/${guideId}/assessments/${assessmentId}/publish`)
    .set(headers)
    .set('Cookie', owner.cookie)
    .send({ passingBasisPoints: 5000, operationId: publishOp })
    .expect(201);

  const attemptRes = await request(server)
    .post(`/learning/guides/${guideId}/assessments/${assessmentId}/attempts`)
    .set(headers)
    .set('Cookie', owner.cookie)
    .expect(201);
  attemptId = attemptRes.body.id;
  needles.push(attemptId);
  check(!!attemptId, 'Assessment attempt started');

  const questionId = attemptRes.body.questions[0].id;
  await request(server)
    .patch(`/learning/guides/${guideId}/assessments/${assessmentId}/attempts/${attemptId}/answers`)
    .set(headers)
    .set('Cookie', owner.cookie)
    .send({
      questionId,
      response: { selectedOptionId: correctOptionId },
      operationId: randomUUID(),
    })
    .expect(200);
  await request(server)
    .post(`/learning/guides/${guideId}/assessments/${assessmentId}/attempts/${attemptId}/submissions`)
    .set(headers)
    .set('Cookie', owner.cookie)
    .send({ operationId: randomUUID() })
    .expect(201);

  const tree3 = await request(server)
    .get(`/learning/guides/${guideId}/tree`)
    .set(headers)
    .set('Cookie', owner.cookie)
    .expect(200);
  const rev = tree3.body.nodes.find((n) => n.id === nodeId).contentRevision;
  const problemUrl = 'https://leetcode.com/problems/privacy-marker-two-sum/';
  await request(server)
    .put(`/learning/guides/${guideId}/nodes/${nodeId}/content`)
    .set(headers)
    .set('Cookie', owner.cookie)
    .send({
      expectedContentRevision: rev,
      operationId: randomUUID(),
      blocks: [
        {
          type: 'problem',
          payload: { url: problemUrl, label: 'Privacy marker problem' },
        },
      ],
    })
    .expect(200);

  const problem = await request(server)
    .post('/problems')
    .set(headers)
    .set('Cookie', owner.cookie)
    .send({ url: problemUrl, title: 'Privacy marker problem' })
    .expect(201);
  backlinkProblemId = problem.body.id;
  needles.push(backlinkProblemId);
  for (let i = 0; i < 4; i += 1) {
    await request(server)
      .post('/problems')
      .set(headers)
      .set('Cookie', owner.cookie)
      .send({
        url: `https://leetcode.com/problems/privacy-seed-${randomUUID()}/`,
        title: `Privacy filler ${i}`,
      })
      .expect(201);
  }

  await request(server).get('/learning/guides').expect(401);
  check(true, 'Unauthenticated guide list rejected');

  await request(server).get(`/learning/guides/${guideId}`).expect(401);
  check(true, 'Unauthenticated guide detail rejected');

  const pub = await request(server).get(`/public/people/${ownerHandle}`).expect(200);
  check(pub.body.handle === ownerHandle, 'Public profile returns owner handle');
  scanAndCheck(pub.body, needles, 'public profile');

  const people = await request(server)
    .get(`/people/${ownerHandle}`)
    .set(headers)
    .set('Cookie', viewer.cookie);
  check(people.status === 200, 'Discover people returns owner');
  scanAndCheck(people.body, needles, 'discover people');

  const search = await request(server)
    .get(`/discover/search?q=${encodeURIComponent(ownerHandle)}&limit=10`)
    .set(headers)
    .set('Cookie', viewer.cookie)
    .expect(200);
  check(Array.isArray(search.body.items), 'Discover search returns person cards');
  const searchHit = search.body.items.some((row) => row.handle === ownerHandle);
  check(searchHit, 'Discover search lists owner after discovery eligibility');
  scanAndCheck(search.body, needles, 'discover search');

  const forYou = await request(server)
    .get('/discover/for-you')
    .set(headers)
    .set('Cookie', viewer.cookie)
    .expect(200);
  scanAndCheck(forYou.body, needles, 'discover for-you');

  const shareStats = await request(server)
    .get('/users/me/share-stats?days=30')
    .set(headers)
    .set('Cookie', owner.cookie)
    .expect(200);
  check(typeof shareStats.body.profileViews === 'number', 'Share stats shape');
  scanAndCheck(shareStats.body, needles, 'share stats');

  const activity = await request(server)
    .get('/progress/activity?weeks=4')
    .set(headers)
    .set('Cookie', owner.cookie)
    .expect(200);
  scanAndCheck(activity.body, needles, 'progress activity');

  const summaries = await request(server)
    .get('/progress')
    .set(headers)
    .set('Cookie', owner.cookie)
    .expect(200);
  scanAndCheck(summaries.body, needles, 'progress summaries');

  const refsCross = await request(server)
    .get(`/problems/${backlinkProblemId}/learning-references`)
    .set(headers)
    .set('Cookie', viewer.cookie);
  check(refsCross.status === 404, 'Viewer cannot read owner problem learning references');

  console.log(`Passed ${count} PostgreSQL/HTTP learning privacy assertions.`);
} finally {
  if (emails.length) {
    await pool.query('delete from users where email=ANY($1::text[])', [emails]).catch(() => {});
  }
  await app.close();
  await pool.end();
}