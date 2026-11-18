#!/usr/bin/env node
/**
 * GOOGLE-RISC R7 — fast regression (no TEST_DATABASE_URL).
 * CI default: GOOGLE_RISC_ENABLED=false; no Google Cloud secrets required.
 */
import 'reflect-metadata';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Test } from '@nestjs/testing';
import request from 'supertest';

const backendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
let checks = 0;

function check(condition, message) {
  assert.ok(condition, message);
  checks += 1;
}

const developmentEnv = {
  JWT_ISSUER: 'practice-backend',
  JWT_AUDIENCE: 'practice-api',
  JWT_ACCESS_TTL_SECONDS: '600',
  AUTH_SESSION_TTL_SECONDS: '604800',
  PASSWORD_RESET_TTL_SECONDS: '1800',
  ARGON2_MEMORY_KIB: '19456',
  ARGON2_TIME_COST: '2',
  ARGON2_PARALLELISM: '1',
  AUTH_COOKIE_SECURE: 'false',
  AUTH_ACCESS_COOKIE_NAME: 'practice_access',
  AUTH_REFRESH_COOKIE_NAME: 'practice_refresh',
  FRONTEND_ORIGIN: 'http://localhost:3001',
  EMAIL_DELIVERY_MODE: 'mock',
  JWT_ACCESS_SECRET: 'test-access-secret-not-for-production-0001',
  JWT_REFRESH_SECRET: 'test-refresh-secret-not-for-production-0002',
  CLOUDINARY_CLOUD_NAME: 'test_cloud',
  CLOUDINARY_API_KEY: 'test_api_key',
  CLOUDINARY_API_SECRET: 'test_api_secret',
  GOOGLE_OAUTH_ENABLED: 'false',
  GOOGLE_RISC_ENABLED: 'false',
  NODE_ENV: 'development',
  HOST: '0.0.0.0',
  PORT: '3000',
  DATABASE_URL: 'postgresql://user:secret@localhost:5432/practice',
  SWAGGER_ENABLED: 'false',
};

const googleOauthOn = {
  GOOGLE_OAUTH_ENABLED: 'true',
  GOOGLE_OAUTH_CLIENT_ID: 'test.apps.googleusercontent.com',
  GOOGLE_OAUTH_CLIENT_SECRET: 'test-client-secret-value',
  GOOGLE_OAUTH_REDIRECT_URI:
    'http://localhost:3001/api/auth/google/callback',
};

async function checkEnvironmentSchema() {
  const { environmentSchema } = await import('../dist/config/environment.js');
  const base = environmentSchema.parse(developmentEnv);
  check(base.GOOGLE_RISC_ENABLED === false, 'default env has RISC disabled');
  check(
    !environmentSchema.safeParse({
      ...developmentEnv,
      GOOGLE_RISC_ENABLED: 'true',
    }).success,
    'RISC enabled without OAuth is rejected',
  );
  const enabled = environmentSchema.parse({
    ...developmentEnv,
    ...googleOauthOn,
    GOOGLE_RISC_ENABLED: 'true',
  });
  check(enabled.GOOGLE_RISC_ENABLED === true, 'RISC enabled with OAuth parses');
}

function checkAuthTestDefault() {
  const text = fs.readFileSync(
    path.join(backendRoot, 'test/auth-env.ts'),
    'utf8',
  );
  check(
    text.includes("GOOGLE_RISC_ENABLED: 'false'"),
    'authTestEnvironment defaults RISC off',
  );
}

function checkEnvExample() {
  const text = fs.readFileSync(
    path.join(backendRoot, '.env.example'),
    'utf8',
  );
  check(text.includes('GOOGLE_RISC_ENABLED='), '.env.example documents RISC');
}

function checkStaticWiring() {
  const moduleText = fs.readFileSync(
    path.join(backendRoot, 'src/modules/auth/risc/google-risc.module.ts'),
    'utf8',
  );
  check(moduleText.includes('GoogleRiscController'), 'GoogleRiscModule has controller');
  check(
    moduleText.includes('GoogleRiscRateLimitGuard'),
    'GoogleRiscModule registers rate limit guard',
  );

  const authModuleText = fs.readFileSync(
    path.join(backendRoot, 'src/modules/auth/auth.module.ts'),
    'utf8',
  );
  check(
    authModuleText.includes('forwardRef(() => GoogleRiscModule)'),
    'AuthModule imports GoogleRiscModule via forwardRef',
  );

  const controllerText = fs.readFileSync(
    path.join(backendRoot, 'src/modules/auth/risc/google-risc.controller.ts'),
    'utf8',
  );
  check(controllerText.includes("@Post('risc')"), 'RISC POST route present');
  check(
    !controllerText.includes('AuthSecurityGuard'),
    'RISC controller does not use AuthSecurityGuard',
  );

  const configureText = fs.readFileSync(
    path.join(backendRoot, 'src/configure-app.ts'),
    'utf8',
  );
  check(
    configureText.includes('GOOGLE_RISC_RECEIVER_PATH'),
    'configure-app branches RISC raw body parser',
  );

  const openapi = fs.readFileSync(
    path.join(backendRoot, 'openapi.json'),
    'utf8',
  );
  check(
    openapi.includes('"/auth/google/risc"'),
    'OpenAPI lists RISC webhook path',
  );
}

function runVitestRisc() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'pnpm',
      ['exec', 'vitest', 'run', 'src/modules/auth/risc'],
      {
        cwd: backendRoot,
        stdio: 'inherit',
        shell: false,
        env: process.env,
      },
    );
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`vitest risc specs exited ${code}`)),
    );
  });
}

async function checkHttpSmoke() {
  const saved = { ...process.env };
  try {
    Object.assign(process.env, developmentEnv);
    const { AppModule } = await import('../dist/app.module.js');
    const { DatabaseService } = await import(
      '../dist/database/database.service.js'
    );
    const { configureApp } = await import('../dist/configure-app.js');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService)
      .useValue({})
      .compile();
    const app = moduleRef.createNestApplication({ logger: false });
    configureApp(app, true);
    await app.init();
    await request(app.getHttpServer())
      .post('/auth/google/risc')
      .set('Content-Type', 'application/secevent+jwt')
      .send('')
      .expect(404);
    check(true, 'POST /auth/google/risc returns 404 when RISC disabled');
    await app.close();

    const { GoogleRiscService } = await import(
      '../dist/modules/auth/risc/google-risc.service.js'
    );
    const riscEnabledMock = {
      isEnabled: () => true,
      verifySet: async () => {
        throw new Error('verifySet must not run for empty-body smoke');
      },
      handleVerifiedEvent: async () => ({
        status: 'noop',
        jti: 'smoke',
      }),
    };
    const enabledModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue({})
      .overrideProvider(GoogleRiscService)
      .useValue(riscEnabledMock)
      .compile();
    const enabledApp = enabledModule.createNestApplication({ logger: false });
    configureApp(enabledApp, true);
    await enabledApp.init();
    const bad = await request(enabledApp.getHttpServer())
      .post('/auth/google/risc')
      .set('Content-Type', 'application/secevent+jwt')
      .send('')
      .expect(400);
    check(
      bad.body?.code === 'RISC_SET_MALFORMED',
      'empty POST returns 400 RISC_SET_MALFORMED when RISC enabled',
    );
    await enabledApp.close();
  } finally {
    for (const key of Object.keys(process.env)) {
      if (!(key in saved)) delete process.env[key];
    }
    Object.assign(process.env, saved);
  }
}

async function main() {
  if (!fs.existsSync(path.join(backendRoot, 'dist/app.module.js'))) {
    throw new Error('Missing dist/ — run pnpm build in solve-tracker-backend first.');
  }
  await checkEnvironmentSchema();
  checkAuthTestDefault();
  checkEnvExample();
  checkStaticWiring();
  await runVitestRisc();
  check(true, 'vitest src/modules/auth/risc passed');
  await checkHttpSmoke();
  console.log(`OK: verify:google-risc (${checks} checks)`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});