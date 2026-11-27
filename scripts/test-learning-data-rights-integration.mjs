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

const FORBIDDEN_EXPORT_SUBSTRINGS = [
  'gradingConfig',
  'attemptId',
  'scoreBasisPoints',
  'correctOptionId',
];

let count = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  count++;
};

async function registerAndLogin(server, label = 'rights') {
  const email = `${label}-${randomUUID()}@example.test`;
  const password = 'a long testing passphrase 🌱';
  await request(server)
    .post('/auth/register')
    .set(headers)
    .send({ name: 'Rights user', email, password })
    .expect(201);
  const login = await request(server)
    .post('/auth/login')
    .set(headers)
    .send({ email, password })
    .expect(200);
  const cookie = login.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ');
  return { email, password, cookie };
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

  const userA = await registerAndLogin(server, 'export');
  const userB = await registerAndLogin(server, 'foreign');

  const createOp = randomUUID();
  const created = await request(server)
    .post('/learning/guides')
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ title: 'Rights guide', description: 'Export scope', operationId: createOp })
    .expect(201);
  const guideId = created.body.resourceId;

  const jsonExport = await request(server)
    .get(`/learning/guides/${guideId}/export?format=json`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  const jsonText = JSON.stringify(jsonExport.body);
  check(jsonExport.body.schemaVersion != null, 'JSON export includes schemaVersion');
  check(jsonExport.body.nodes != null || jsonExport.body.blocks != null, 'JSON export has structure');
  for (const needle of FORBIDDEN_EXPORT_SUBSTRINGS) {
    check(!jsonText.includes(needle), `JSON export must not contain ${needle}`);
  }

  const mdExport = await request(server)
    .get(`/learning/guides/${guideId}/export?format=markdown`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  const mdType = mdExport.headers['content-type'] ?? '';
  check(mdType.includes('markdown'), 'Markdown export Content-Type is markdown');
  const mdBody = typeof mdExport.text === 'string' ? mdExport.text : String(mdExport.body ?? '');
  check(mdBody.trim().length > 0, 'Markdown export body is non-empty');

  const preview = await request(server)
    .post('/learning/imports/preview')
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ format: 'json', content: JSON.stringify(jsonExport.body) })
    .expect(201);
  const commit = await request(server)
    .post(`/learning/imports/${preview.body.importId}/commit`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ operationId: randomUUID() })
    .expect(201);
  check(Boolean(commit.body.resourceId), 'Import roundtrip produces a new guide id');
  check(commit.body.resourceId !== guideId, 'Roundtrip guide id differs from source');

  const guideDetail = await request(server)
    .get(`/learning/guides/${guideId}`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);

  await request(server)
    .delete(`/learning/guides/${guideId}`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .set('X-Expected-Revision', guideDetail.body.metadataRevision)
    .set('X-Operation-Id', randomUUID())
    .expect(204);

  const afterDelete = await request(server)
    .get(`/learning/guides/${guideId}`)
    .set(headers)
    .set('Cookie', userA.cookie);
  check(afterDelete.status === 404, 'Owner GET guide after delete returns 404');

  const crossGet = await request(server)
    .get(`/learning/guides/${guideId}`)
    .set(headers)
    .set('Cookie', userB.cookie);
  check(crossGet.status === 404, 'Other user GET deleted guide returns 404');

  const guideRows = await pool.query(
    `SELECT deleted_at IS NOT NULL AS soft_deleted FROM learning_guides WHERE id = $1::uuid`,
    [guideId],
  );
  check(guideRows.rows[0]?.soft_deleted === true, 'Guide soft-delete sets deleted_at');

  const eraseUser = await registerAndLogin(server, 'erase');
  const eraseGuideCreate = await request(server)
    .post('/learning/guides')
    .set(headers)
    .set('Cookie', eraseUser.cookie)
    .send({ title: 'Erase me', description: '', operationId: randomUUID() })
    .expect(201);
  const eraseGuideId = eraseGuideCreate.body.resourceId;

  const tree = await request(server)
    .get(`/learning/guides/${eraseGuideId}/tree`)
    .set(headers)
    .set('Cookie', eraseUser.cookie)
    .expect(200);
  await request(server)
    .post(`/learning/guides/${eraseGuideId}/nodes`)
    .set(headers)
    .set('Cookie', eraseUser.cookie)
    .send({
      title: 'Step',
      parentId: null,
      beforeNodeId: null,
      expectedStructureRevision: tree.body.structureRevision,
      operationId: randomUUID(),
    })
    .expect(201);

  const wrongPassword = await request(server)
    .delete('/users/me')
    .set(headers)
    .set('Cookie', eraseUser.cookie)
    .send({ password: 'wrong passphrase', confirmation: 'DELETE' });
  check(wrongPassword.status === 401, 'Wrong password rejected for account erasure');

  await request(server)
    .delete('/users/me')
    .set(headers)
    .set('Cookie', eraseUser.cookie)
    .send({ password: eraseUser.password, confirmation: 'DELETE' })
    .expect(204);

  const loginAfter = await request(server)
    .post('/auth/login')
    .set(headers)
    .send({ email: eraseUser.email, password: eraseUser.password });
  check(loginAfter.status === 401, 'Login fails after account erasure');

  const learningAfterErase = await pool.query(
    `SELECT count(*)::int AS n FROM learning_guides WHERE id = $1::uuid`,
    [eraseGuideId],
  );
  check(learningAfterErase.rows[0].n === 0, 'Learning guide removed after account erasure');

  console.log(`Learning data rights integration passed (${count} assertions).`);
} finally {
  await app.close();
  await pool.end();
}