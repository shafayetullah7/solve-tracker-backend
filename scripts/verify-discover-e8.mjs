#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'path';

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

await run('node', ['scripts/verify-discover-e6.mjs'], backendRoot, env);
await run('pnpm', ['build'], backendRoot, env);
await run('node', ['scripts/test-discover-follow-integration.mjs'], backendRoot, env);
await run('pnpm', ['typecheck'], frontendRoot, env);
await run(
  'pnpm',
  [
    'exec',
    'vitest',
    'run',
    'src/lib/discover/copy.test.ts',
    'src/components/people/PeopleFollowButton.test.tsx',
  ],
  frontendRoot,
  env,
);
await run(
  'pnpm',
  ['exec', 'vitest', 'run', 'src/modules/follows/follows.service.spec.ts'],
  backendRoot,
  env,
);

console.log('verify:discover-e8 complete.');