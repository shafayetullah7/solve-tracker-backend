#!/usr/bin/env node
/**
 * Test-only: issue a password-reset token for an existing user email.
 * Prints the raw token to stdout (one line). Not part of the deployed app.
 *
 * Usage: PHASE_47_ISSUE_RESET=1 node scripts/phase-4.7-issue-reset-token.mjs <email>
 *
 * Uses DATABASE_URL (backend .env). Refuses unless DB ends with _test or
 * PHASE_47_ALLOW_DEV_DB=1 is set.
 */
import 'reflect-metadata';
import 'dotenv/config';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const email = process.argv[2];
if (!email) {
  console.error('Usage: PHASE_47_ISSUE_RESET=1 node scripts/phase-4.7-issue-reset-token.mjs <email>');
  process.exit(1);
}
if (process.env.PHASE_47_ISSUE_RESET !== '1') {
  console.error('Set PHASE_47_ISSUE_RESET=1 to run this harness.');
  process.exit(1);
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error('DATABASE_URL is required');
const allowDev = process.env.PHASE_47_ALLOW_DEV_DB === '1';
if (!allowDev && !new URL(dbUrl).pathname.endsWith('_test')) {
  throw new Error(
    'DATABASE_URL must point at a *_test database, or set PHASE_47_ALLOW_DEV_DB=1 for local dev.',
  );
}

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(backendRoot);

const sent = [];
const { Test } = await import('@nestjs/testing');
const { AppModule } = await import('../dist/app.module.js');
const { EmailService } = await import('../dist/modules/email/email.service.js');
const { configureApp } = await import('../dist/configure-app.js');
const { AuthService } = await import('../dist/modules/auth/auth.service.js');

const module = await Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(EmailService)
  .useValue({
    sendReset: async (to, token) => {
      sent.push({ to, token });
    },
  })
  .compile();

const app = module.createNestApplication({ logger: false });
configureApp(app, true);
await app.init();

const auth = app.get(AuthService);
await auth.forgot(email);
assert.ok(sent.length > 0, 'forgot must capture a reset token');
const latest = sent.filter((e) => e.to === email.toLowerCase()).at(-1);
assert.ok(latest?.token, 'token missing for email');
process.stdout.write(latest.token);
await app.close();