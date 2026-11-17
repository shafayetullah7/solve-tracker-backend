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
import { CloudinaryService } from '../dist/modules/media/cloudinary.service.js';

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
  SWAGGER_ENABLED: 'false',
});

const pool = new pg.Pool({ connectionString: target });
const { AppModule } = await import('../dist/app.module.js');
const { configureApp } = await import('../dist/configure-app.js');

const headers = {
  Origin: 'http://localhost:3001',
  'X-Requested-With': 'practice',
};

let count = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  count++;
};

async function registerAndLogin(server, label) {
  const email = `profile-${label}-${randomUUID()}@example.test`;
  const password = 'a long testing passphrase 🌱';
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
  return { email, password, cookie };
}

const testPng = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

const mockCloudinary = {
  uploadImage: async (buffer, folder) => {
    assert.ok(buffer.length > 0);
    assert.ok(folder.startsWith('users/'));
    return {
      publicId: `${folder}/integration-${randomUUID()}`,
      bytes: buffer.length,
      width: 1,
      height: 1,
      format: 'png',
    };
  },
  destroyImage: async () => {},
};

const module = await Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(EmailService)
  .useValue({ sendReset: async () => {} })
  .overrideProvider(CloudinaryService)
  .useValue(mockCloudinary)
  .compile();
const app = module.createNestApplication({ logger: false });
configureApp(app, false);

try {
  await migrate(drizzle({ client: pool }), { migrationsFolder: './drizzle' });
  await migrate(drizzle({ client: pool }), { migrationsFolder: './drizzle' });
  await app.init();
  const server = app.getHttpServer();

  const user = await registerAndLogin(server, 'main');

  const initial = await request(server)
    .get('/users/me/profile')
    .set(headers)
    .set('Cookie', user.cookie)
    .expect(200);
  check(initial.body.name === 'User main', 'GET profile returns registered name');
  check(Array.isArray(initial.body.work) && initial.body.work.length === 0, 'Empty work');

  const patched = await request(server)
    .patch('/users/me/profile')
    .set(headers)
    .set('Cookie', user.cookie)
    .send({ bio: 'Hello profile' })
    .expect(200);
  check(patched.body.bio === 'Hello profile', 'PATCH bio');

  const work = await request(server)
    .post('/users/me/work-entries')
    .set(headers)
    .set('Cookie', user.cookie)
    .send({ organization: 'Acme', role: 'Intern' })
    .expect(201);
  const workId = work.body.id;

  await request(server)
    .patch(`/users/me/work-entries/${workId}`)
    .set(headers)
    .set('Cookie', user.cookie)
    .send({ organization: 'Acme', role: 'Engineer', period: '2025' })
    .expect(200);

  await request(server)
    .delete(`/users/me/work-entries/${workId}`)
    .set(headers)
    .set('Cookie', user.cookie)
    .expect(204);

  await request(server)
    .post('/users/me/education-entries')
    .set(headers)
    .set('Cookie', user.cookie)
    .send({ institution: 'State U', program: 'CS' })
    .expect(201);

  await request(server)
    .post('/users/me/education-entries')
    .set(headers)
    .set('Cookie', user.cookie)
    .send({ institution: 'Tech Inst', program: 'Math' })
    .expect(201);

  const thirdEdu = await request(server)
    .post('/users/me/education-entries')
    .set(headers)
    .set('Cookie', user.cookie)
    .send({ institution: 'Extra', program: 'X' })
    .expect(409);
  check(thirdEdu.body.code === 'EDUCATION_LIMIT', 'Education cap');

  const upload = await request(server)
    .post('/media')
    .set(headers)
    .set('Cookie', user.cookie)
    .attach('file', testPng, { filename: 'avatar.png', contentType: 'image/png' })
    .expect(201);
  check(typeof upload.body.id === 'string', 'Media upload returns id');

  const withAvatar = await request(server)
    .patch('/users/me/profile')
    .set(headers)
    .set('Cookie', user.cookie)
    .send({ avatarMediaId: upload.body.id })
    .expect(200);
  check(typeof withAvatar.body.avatarUrl === 'string', 'Avatar URL after link');

  const newPassword = 'another long passphrase 🌱';
  await request(server)
    .post('/auth/change-password')
    .set(headers)
    .set('Cookie', user.cookie)
    .send({ currentPassword: user.password, newPassword })
    .expect(204);

  await request(server)
    .post('/auth/login')
    .set(headers)
    .send({ email: user.email, password: user.password })
    .expect(401);

  const relogin = await request(server)
    .post('/auth/login')
    .set(headers)
    .send({ email: user.email, password: newPassword })
    .expect(200);

  check(relogin.body.user.name === 'User main', 'Login after password change');

  console.log(`Profile integration checks passed (${count}).`);
} finally {
  await app.close();
  await pool.end();
}