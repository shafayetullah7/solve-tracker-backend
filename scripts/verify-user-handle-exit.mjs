#!/usr/bin/env node
/**
 * USER-HANDLE H4 — full regression (requires TEST_DATABASE_URL).
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

  console.log('User handle exit — fast verify …');
  await run('pnpm', ['build']);
  await run('node', ['scripts/verify-user-handle.mjs']);

  console.log('User handle exit — unit tests …');
  await run('pnpm', ['test']);

  console.log('User handle exit — schema + auth + profile integration …');
  await run('pnpm', ['db:check']);
  await run('node', ['scripts/test-user-handle-schema.mjs']);
  await run('node', ['scripts/test-auth-integration.mjs']);
  await run('node', ['scripts/test-profile-integration.mjs']);

  console.log('User handle exit — OpenAPI drift …');
  await run('pnpm', ['api:check']);
  await run('pnpm', ['api:check'], frontendRoot);

  console.log('User handle exit — frontend unit tests …');
  await run('pnpm', ['test'], frontendRoot);

  console.log('\nUser handle automated exit passed.');
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});