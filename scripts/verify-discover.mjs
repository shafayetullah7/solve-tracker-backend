#!/usr/bin/env node
/**
 * DISCOVER launch gate (E7) — runs verify-discover-e1 … e9 and integration script.
 *
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

const phases = [
  'verify-discover-e1.mjs',
  'verify-discover-e2.mjs',
  'verify-discover-e3.mjs',
  'verify-discover-e4.mjs',
  'verify-discover-e5.mjs',
  'verify-discover-e6.mjs',
  'verify-discover-e8.mjs',
  'verify-discover-e9.mjs',
];

for (const script of phases) {
  console.log(`\nDISCOVER — ${script} …`);
  await run('node', [`scripts/${script}`], backendRoot, env);
}

console.log('\nDISCOVER — test-discover-events-integration.mjs …');
await run('pnpm', ['build'], backendRoot, env);
await run(
  'node',
  ['scripts/test-discover-events-integration.mjs'],
  backendRoot,
  env,
);

console.log('\nDISCOVER — verify:discover PASS');