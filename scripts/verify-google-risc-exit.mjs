#!/usr/bin/env node
/**
 * GOOGLE-RISC R7 — full regression (requires TEST_DATABASE_URL).
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const backendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

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

  console.log('Google RISC exit — build …');
  await run('pnpm', ['build']);

  console.log('Google RISC exit — fast verify …');
  await run('node', ['scripts/verify-google-risc.mjs']);

  console.log('Google RISC exit — PostgreSQL integration …');
  await run('node', ['scripts/test-risc-receipts.mjs']);
  await run('node', ['scripts/test-google-risc-handle.mjs']);
  await run('node', ['scripts/test-google-risc-http.mjs']);

  console.log('Google RISC exit — OpenAPI drift …');
  await run('pnpm', ['api:check']);

  console.log('\nGoogle RISC automated exit passed.');
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});