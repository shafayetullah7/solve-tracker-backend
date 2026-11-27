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
});

const headers = {
  Origin: 'http://localhost:3001',
  'X-Requested-With': 'practice',
};

const FORBIDDEN_GRADING_SUBSTRINGS = [
  'gradingConfig',
  'correctOptionId',
  'correctOptionIds',
  'correctValue',
  'correctValueScaled',
];

let count = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  count++;
};

function assertNoGradingLeaks(body, label) {
  const text = JSON.stringify(body ?? {});
  for (const needle of FORBIDDEN_GRADING_SUBSTRINGS) {
    assert.ok(!text.includes(needle), `${label}: response must not contain ${needle}`);
  }
}

async function registerAndLogin(server) {
  const email = `ops-${randomUUID()}@example.test`;
  const password = 'a long testing passphrase 🌱';
  await request(server)
    .post('/auth/register')
    .set(headers)
    .send({ name: 'Ops user', email, password })
    .expect(201);
  const login = await request(server)
    .post('/auth/login')
    .set(headers)
    .send({ email, password })
    .expect(200);
  const cookie = login.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ');
  return { email, cookie };
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

try {
  await migrate(drizzle({ client: pool }), { migrationsFolder: './drizzle' });

  await app.init();
  const server = app.getHttpServer();

  const live = await request(server).get('/health').expect(200);
  check(live.body.status === 'ok', 'GET /health returns ok');
  check(
    (live.headers['cache-control'] ?? '').includes('no-store'),
    'GET /health sets Cache-Control no-store',
  );

  const ready = await request(server).get('/health/ready').expect(200);
  check(ready.body.status === 'ready', 'GET /health/ready returns ready');
  check(
    (ready.headers['cache-control'] ?? '').includes('no-store'),
    'GET /health/ready sets Cache-Control no-store',
  );

  const { cookie } = await registerAndLogin(server);

  const createOp = randomUUID();
  const created = await request(server)
    .post('/learning/guides')
    .set(headers)
    .set('Cookie', cookie)
    .send({ title: 'Ops guide', description: '', operationId: createOp })
    .expect(201);
  const guideId = created.body.resourceId;

  const tree = await request(server)
    .get(`/learning/guides/${guideId}/tree`)
    .set(headers)
    .set('Cookie', cookie)
    .expect(200);

  const nodeRes = await request(server)
    .post(`/learning/guides/${guideId}/nodes`)
    .set(headers)
    .set('Cookie', cookie)
    .send({
      title: 'Lesson',
      parentId: null,
      beforeNodeId: null,
      expectedStructureRevision: tree.body.structureRevision,
      operationId: randomUUID(),
    })
    .expect(201);
  const nodeId = nodeRes.body.id;

  const assessmentCreate = await request(server)
    .post(`/learning/guides/${guideId}/assessments`)
    .set(headers)
    .set('Cookie', cookie)
    .send({ title: 'Ops quiz', operationId: randomUUID() })
    .expect(201);
  const assessmentId = assessmentCreate.body.id;

  const correctOptionId = randomUUID();
  await request(server)
    .post(`/learning/guides/${guideId}/assessments/${assessmentId}/questions`)
    .set(headers)
    .set('Cookie', cookie)
    .send({
      kind: 'single_choice',
      prompt: {
        stem: 'Pick',
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

  await request(server)
    .post(`/learning/guides/${guideId}/assessments/${assessmentId}/revisions`)
    .set(headers)
    .set('Cookie', cookie)
    .send({ passingBasisPoints: 5000, operationId: randomUUID() })
    .expect(201);
  await request(server)
    .post(`/learning/guides/${guideId}/assessments/${assessmentId}/publish`)
    .set(headers)
    .set('Cookie', cookie)
    .send({ passingBasisPoints: 5000, operationId: randomUUID() })
    .expect(201);

  const attemptStart = await request(server)
    .post(`/learning/guides/${guideId}/assessments/${assessmentId}/attempts`)
    .set(headers)
    .set('Cookie', cookie)
    .expect(201);
  assertNoGradingLeaks(attemptStart.body, 'POST start attempt');
  check(attemptStart.body.status === 'in_progress', 'Active attempt status is in_progress');

  const attemptId = attemptStart.body.id;
  const questionId = attemptStart.body.questions[0].id;
  await request(server)
    .patch(`/learning/guides/${guideId}/assessments/${assessmentId}/attempts/${attemptId}/answers`)
    .set(headers)
    .set('Cookie', cookie)
    .send({
      questionId,
      response: { selectedOptionId: correctOptionId },
      operationId: randomUUID(),
    })
    .expect(200);

  const attemptGet = await request(server)
    .get(`/learning/guides/${guideId}/assessments/${assessmentId}/attempts/${attemptId}`)
    .set(headers)
    .set('Cookie', cookie)
    .expect(200);
  assertNoGradingLeaks(attemptGet.body, 'GET attempt');
  check(true, 'GET attempt omits grading keys');

  await request(server)
    .post(`/learning/guides/${guideId}/assessments/${assessmentId}/attempts/${attemptId}/submit`)
    .set(headers)
    .set('Cookie', cookie)
    .send({ operationId: randomUUID() })
    .expect(201);

  const finalized = await request(server)
    .get(`/learning/guides/${guideId}/assessments/${assessmentId}/attempts/${attemptId}`)
    .set(headers)
    .set('Cookie', cookie)
    .expect(200);
  assertNoGradingLeaks(finalized.body, 'GET finalized attempt');
  check(true, 'Finalized attempt GET omits grading keys');

  const foreignId = randomUUID();
  const foreign = await request(server)
    .get(`/learning/guides/${foreignId}/tree`)
    .set(headers)
    .set('Cookie', cookie);
  check(foreign.status === 404, 'Foreign guide returns 404');
  check(foreign.body.code === 'NOT_FOUND', 'Foreign guide error has NOT_FOUND code');
  const foreignText = JSON.stringify(foreign.body);
  check(!foreignText.includes('stack'), 'Foreign guide error has no stack trace');
  check(!foreignText.includes('Error:'), 'Foreign guide error has no Error prefix');

  const oversizeContent = 'x'.repeat(8_388_609);
  const oversize = await request(server)
    .post('/learning/imports/preview')
    .set(headers)
    .set('Cookie', cookie)
    .send({ format: 'json', content: oversizeContent });
  check(
    oversize.status === 400 || oversize.status === 413,
    'Oversize import preview rejected (400 or 413)',
  );
  if (oversize.status === 400) {
    check(oversize.body.code === 'VALIDATION_ERROR', 'Oversize import returns VALIDATION_ERROR');
  }

  console.log(`Learning ops integration passed (${count} assertions).`);
} finally {
  await app.close();
  await pool.end();
}