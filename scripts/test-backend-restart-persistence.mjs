#!/usr/bin/env node
/**
 * MVP acceptance criterion 11 — data survives backend process restart (new Nest bootstrap).
 * Uses dedicated TEST_DATABASE_URL; creates a problem, tears down the app, boots again, GET by id.
 */
import 'reflect-metadata';
import 'dotenv/config';
import assert from 'node:assert/strict';
import pg from 'pg';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { authTestEnvironment } from '../test/auth-env.ts';

const target = process.env.TEST_DATABASE_URL;
if (!target || !new URL(target).pathname.endsWith('_test'))
  throw new Error(
    'Set TEST_DATABASE_URL to a database whose name ends in _test before running persistence checks.',
  );

Object.assign(process.env, authTestEnvironment, {
  NODE_ENV: 'test',
  DATABASE_URL: target,
  PORT: '3000',
  HOST: '127.0.0.1',
  SWAGGER_ENABLED: 'false',
});

const headers = {
  Origin: 'http://localhost:3001',
  'X-Requested-With': 'practice',
};

const emails = [];

async function bootstrapApp() {
  const { AppModule } = await import('../dist/app.module.js');
  const { configureApp } = await import('../dist/configure-app.js');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return { app, server: app.getHttpServer() };
}

async function registerAndLogin(server) {
  const email = `persist-${randomUUID()}@example.test`;
  const password = 'a long testing passphrase 🌱';
  emails.push(email);
  await request(server)
    .post('/auth/register')
    .set(headers)
    .send({ name: 'Persist User', email, password })
    .expect(201);
  const login = await request(server)
    .post('/auth/login')
    .set(headers)
    .send({ email, password })
    .expect(200);
  const cookie = login.headers['set-cookie']
    .map((c) => c.split(';')[0])
    .join('; ');
  return { cookie, email };
}

const pool = new pg.Pool({ connectionString: target });

let first;
try {
  first = await bootstrapApp();
  const { cookie } = await registerAndLogin(first.server);
  const url = `https://leetcode.com/problems/persist-${randomUUID()}/`;
  const created = await request(first.server)
    .post('/problems')
    .set(headers)
    .set('Cookie', cookie)
    .send({ title: 'Restart persistence probe', url, topicIds: [] })
    .expect(201);
  const problemId = created.body.id;
  await first.app.close();

  const second = await bootstrapApp();
  const byId = await request(second.server)
    .get(`/problems/${problemId}`)
    .set(headers)
    .set('Cookie', cookie)
    .expect(200);
  assert.equal(byId.body.id, problemId);
  assert.equal(byId.body.title, 'Restart persistence probe');
  await second.app.close();

  console.log('OK: problem readable after backend re-bootstrap (PostgreSQL persistence).');
} finally {
  if (first?.app) await first.app.close().catch(() => {});
  if (emails.length)
    await pool
      .query('delete from users where email=ANY($1::text[])', [emails])
      .catch(() => {});
  await pool.end();
}