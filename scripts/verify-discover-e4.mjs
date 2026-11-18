#!/usr/bin/env node
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

const env = { ...process.env, TEST_DATABASE_URL: target };

await run('node', ['scripts/verify-discover-e3.mjs'], backendRoot, env);
await run('pnpm', ['build'], backendRoot, env);
await run('node', ['scripts/test-discover-integration.mjs'], backendRoot, env);
await run('pnpm', ['db:check'], backendRoot, env);
await run('pnpm', ['test'], backendRoot, env);
await run('pnpm', ['typecheck'], frontendRoot, env);
await run('pnpm', ['vitest', 'run'], frontendRoot, env);

console.log('\nDISCOVER E4 — verify:discover-e4 passed.');