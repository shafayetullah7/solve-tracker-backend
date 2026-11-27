#!/usr/bin/env node
/**
 * Phase 7G — data rights gates (cumulative 7F + data-rights integration).
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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

async function main() {
  const testDb = process.env.TEST_DATABASE_URL;
  if (!testDb || !new URL(testDb).pathname.endsWith('_test')) {
    throw new Error('TEST_DATABASE_URL ending in _test is required');
  }

  console.log('Learning 7G — cumulative 7F gates …');
  await run('node', ['scripts/verify-learning-7f.mjs']);

  console.log('Learning 7G — data rights integration …');
  await run('node', ['scripts/test-learning-data-rights-integration.mjs']);

  console.log('\nLearning 7G gates passed.');
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});