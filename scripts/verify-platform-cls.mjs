#!/usr/bin/env node
/**
 * PLATFORM-CLS — full gate: P1–P4 + frontend catalog parity.
 * Requires TEST_DATABASE_URL ending in _test (for P1–P4 integration scripts).
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

const phases = [
  'verify:platform-p1',
  'verify:platform-p2',
  'verify:platform-p3',
  'verify:platform-p4',
];

for (const script of phases) {
  console.log(`\nPLATFORM-CLS — ${script} …`);
  await run('pnpm', [script], backendRoot, {
    ...process.env,
    TEST_DATABASE_URL: target,
  });
}

console.log('\nPLATFORM-CLS — frontend verify:catalog …');
await run('pnpm', ['verify:catalog'], frontendRoot);

console.log('\nPLATFORM-CLS — PASS');