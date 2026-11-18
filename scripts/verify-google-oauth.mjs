#!/usr/bin/env node
/**
 * GOOGLE-AUTH G7 — fast regression (no TEST_DATABASE_URL).
 * CI default: GOOGLE_OAUTH_ENABLED=false; no Google secrets required.
 */
import 'reflect-metadata';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Test } from '@nestjs/testing';
import request from 'supertest';

const backendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const frontendRoot = path.resolve(backendRoot, '..', 'solve-tracker-frontend');
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
  NODE_ENV: 'development',
  HOST: '0.0.0.0',
  PORT: '3000',
  DATABASE_URL: 'postgresql://user:secret@localhost:5432/practice',
  SWAGGER_ENABLED: 'false',
};

async function checkEnvironmentSchema() {
  const { environmentSchema } = await import('../dist/config/environment.js');
  check(
    environmentSchema.safeParse(developmentEnv).success,
    'environment accepts Google OAuth disabled',
  );
  check(
    !environmentSchema.safeParse({
      ...developmentEnv,
      GOOGLE_OAUTH_ENABLED: 'true',
    }).success,
    'enabled OAuth requires Google credentials',
  );
  const enabled = environmentSchema.parse({
    ...developmentEnv,
    GOOGLE_OAUTH_ENABLED: 'true',
    GOOGLE_OAUTH_CLIENT_ID: 'test.apps.googleusercontent.com',
    GOOGLE_OAUTH_CLIENT_SECRET: 'test-secret-min-length',
    GOOGLE_OAUTH_REDIRECT_URI:
      'http://localhost:3001/api/auth/google/callback',
  });
  check(enabled.GOOGLE_OAUTH_ENABLED === true, 'enabled OAuth with redirect parses');
}

function checkAuthTestDefault() {
  const text = fs.readFileSync(
    path.join(backendRoot, 'test/auth-env.ts'),
    'utf8',
  );
  check(
    text.includes("GOOGLE_OAUTH_ENABLED: 'false'"),
    'authTestEnvironment defaults Google OAuth off',
  );
}

function checkStaticWiring() {
  const moduleText = fs.readFileSync(
    path.join(backendRoot, 'src/modules/auth/auth.module.ts'),
    'utf8',
  );
  check(
    moduleText.includes('GoogleOAuthService'),
    'AuthModule registers GoogleOAuthService',
  );
  const controllerText = fs.readFileSync(
    path.join(backendRoot, 'src/modules/auth/auth.controller.ts'),
    'utf8',
  );
  check(controllerText.includes("@Get('google')"), 'auth google start route');
  check(
    controllerText.includes("@Get('google/callback')"),
    'auth google callback route',
  );
  const loginText = fs.readFileSync(
    path.join(frontendRoot, 'src/routes/login.tsx'),
    'utf8',
  );
  const registerText = fs.readFileSync(
    path.join(frontendRoot, 'src/routes/register.tsx'),
    'utf8',
  );
  check(
    loginText.includes('isGoogleOAuthEnabled') &&
      registerText.includes('isGoogleOAuthEnabled'),
    'login/register gate Google UI on build flag',
  );
}

function checkClientBundlePatterns() {
  const forbidden = [
    { pattern: /\bid_token\b/i, label: 'id_token' },
    {
      pattern: /accounts\.google\.com\/o\/oauth2/i,
      label: 'Google OAuth URL in client',
    },
  ];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(name)) {
        const rel = path.relative(frontendRoot, full);
        const text = fs.readFileSync(full, 'utf8');
        for (const rule of forbidden) {
          if (rule.pattern.test(text)) {
            throw new Error(
              `Forbidden ${rule.label} in solve-tracker-frontend/${rel}`,
            );
          }
        }
      }
    }
  };
  walk(path.join(frontendRoot, 'src'));
  check(true, 'no Google token endpoints in frontend sources');
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
    await request(app.getHttpServer()).get('/auth/google').expect(404);
    check(true, 'GET /auth/google returns 404 when OAuth disabled');
    await app.close();

    Object.assign(process.env, {
      ...developmentEnv,
      GOOGLE_OAUTH_ENABLED: 'true',
      GOOGLE_OAUTH_CLIENT_ID: 'test.apps.googleusercontent.com',
      GOOGLE_OAUTH_CLIENT_SECRET: 'test-client-secret-value',
      GOOGLE_OAUTH_REDIRECT_URI:
        'http://localhost:3001/api/auth/google/callback',
    });
    const { GoogleOAuthService } = await import(
      '../dist/modules/auth/google-oauth.service.js'
    );
    const googleMock = {
      isEnabled: () => true,
      buildAuthorizationUrl: ({ state }) =>
        `https://accounts.google.com/o/oauth2/v2/auth?state=${state}`,
      exchangeCodeForIdToken: async () => 'mock',
      verifyIdToken: async () => ({
        subject: 'sub',
        email: 'a@test',
        name: 'A',
      }),
      clientId: () => process.env.GOOGLE_OAUTH_CLIENT_ID,
      scopes: () => 'openid email profile',
    };
    const enabledModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue({})
      .overrideProvider(GoogleOAuthService)
      .useValue(googleMock)
      .compile();
    const enabledApp = enabledModule.createNestApplication({ logger: false });
    configureApp(enabledApp, true);
    await enabledApp.init();
    const start = await request(enabledApp.getHttpServer())
      .get('/auth/google')
      .expect(302);
    check(
      start.headers.location?.startsWith('https://accounts.google.com'),
      'GET /auth/google redirects when enabled',
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
  checkStaticWiring();
  checkClientBundlePatterns();
  await checkHttpSmoke();
  console.log(`OK: verify:google-oauth (${checks} checks)`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});