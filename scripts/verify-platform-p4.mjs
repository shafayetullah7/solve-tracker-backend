#!/usr/bin/env node
/**
 * PLATFORM-CLS P4 — problem response platformSlug + frontend types/UI.
 * Requires TEST_DATABASE_URL ending in _test.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendRoot = path.resolve(backendRoot, '..', 'solve-tracker-frontend');

const target = process.env.TEST_DATABASE_URL;
if (!target || !new URL(target).pathname.endsWith('_test')) {
  throw new Error(
    'Set TEST_DATABASE_URL to a dedicated database whose name ends in _test.',
  );
}

function run(command, args, cwd, env = process.env) {
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

console.log('P4 verify — backend build + unit tests …');
await run('pnpm', ['build'], backendRoot);
await run('pnpm', ['test'], backendRoot);

console.log('P4 verify — OpenAPI + generated types …');
await run('pnpm', ['api:check'], backendRoot);
await run('pnpm', ['api:types:check'], backendRoot);

console.log('P4 verify — problems integration (platformSlug JSON) …');
await run('pnpm', ['test:problems:integration'], backendRoot, {
  ...process.env,
  TEST_DATABASE_URL: target,
});

console.log('P4 verify — frontend check …');
await run('pnpm', ['check'], frontendRoot);

console.log('P4 API + frontend types — PASS');