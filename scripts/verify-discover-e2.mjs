#!/usr/bin/env node
/**
 * DISCOVER E2 gate — people API + visibility core (D2).
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

const steps = [
  () => run('pnpm', ['build'], backendRoot),
  () => run('pnpm', ['test'], backendRoot),
  () => run('pnpm', ['db:check'], backendRoot),
  () => run('pnpm', ['api:check'], backendRoot),
  () => run('pnpm', ['api:types:check'], backendRoot),
  () =>
    run('node', ['scripts/test-discover-people-integration.mjs'], backendRoot, {
      ...process.env,
      TEST_DATABASE_URL: target,
    }),
  () => run('pnpm', ['api:generate'], frontendRoot),
  () => run('pnpm', ['typecheck'], frontendRoot),
];

for (const step of steps) {
  await step();
}

console.log('\nDISCOVER E2 — verify:discover-e2 passed.');