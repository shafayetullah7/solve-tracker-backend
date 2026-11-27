#!/usr/bin/env node
/**
 * PLATFORM-CLS P2 — server-side platform_slug on create and URL patch.
 * Requires TEST_DATABASE_URL ending in _test.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const target = process.env.TEST_DATABASE_URL;
if (!target || !new URL(target).pathname.endsWith('_test')) {
  throw new Error(
    'Set TEST_DATABASE_URL to a dedicated database whose name ends in _test.',
  );
}

function run(command, args, cwd = backendRoot, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: false,
      env,
    });
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${command} ${args.join(' ')} exited ${code}`)),
    );
  });
}

console.log('P2 verify — build …');
await run('pnpm', ['build']);

console.log('P2 verify — unit tests …');
await run('pnpm', ['test']);

console.log('P2 verify — problems integration (write path SQL checks) …');
await run('node', ['scripts/test-problems-integration.mjs'], backendRoot, {
  ...process.env,
  TEST_DATABASE_URL: target,
});

console.log('P2 write path — PASS');