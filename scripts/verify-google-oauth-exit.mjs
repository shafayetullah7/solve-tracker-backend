#!/usr/bin/env node
/**
 * GOOGLE-AUTH G7 — full Google regression (requires TEST_DATABASE_URL).
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const backendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const frontendRoot = path.resolve(backendRoot, '..', 'solve-tracker-frontend');

function run(command, args, cwd = backendRoot) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: false,
      env: process.env,
    });
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${command} ${args.join(' ')} exited ${code}`)),
    );
  });
}

async function main() {
  const testDb = process.env.TEST_DATABASE_URL;
  if (!testDb || !new URL(testDb).pathname.endsWith('_test')) {
    throw new Error(
      'Set TEST_DATABASE_URL to a dedicated database whose name ends in _test.',
    );
  }

  console.log('Google OAuth exit — fast verify …');
  await run('node', ['scripts/verify-google-oauth.mjs']);

  console.log('Google OAuth exit — PostgreSQL integration …');
  await run('pnpm', ['build']);
  await run('pnpm', ['test:auth-identities:integration']);
  await run('pnpm', ['test:google-oauth:auth']);
  await run('pnpm', ['test:google-oauth:integration']);

  console.log('Google OAuth exit — OpenAPI drift …');
  await run('pnpm', ['api:check']);
  await run('pnpm', ['api:check'], frontendRoot);
  await run('pnpm', ['verify:platform-api'], frontendRoot);

  console.log('\nGoogle OAuth automated exit passed.');
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});