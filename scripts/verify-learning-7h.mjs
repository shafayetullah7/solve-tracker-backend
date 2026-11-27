#!/usr/bin/env node
/**
 * Phase 7H — beta rollout gates (cumulative 7G + optional flag-build audit).
 * BETA_FLAG_BUILD=1 — dual frontend build (slow; signoff recording).
 * BETA_LIVE=1 — print manual runbook reminder after automated gates.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendRoot = path.resolve(backendRoot, '..', 'solve-tracker-frontend');

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

  console.log('Learning 7H — cumulative 7G gates …');
  await run('node', ['scripts/verify-learning-7g.mjs']);

  if (process.env.BETA_FLAG_BUILD === '1') {
    console.log('Learning 7H — dual flag build audit …');
    await run('node', ['scripts/verify-learning-beta-flag-build.mjs'], frontendRoot);
  }

  if (process.env.BETA_LIVE === '1') {
    console.log(
      '\nBETA_LIVE: run staging smoke per docs/learning/LEARNING_BETA_RUNBOOK.md §5 and record in LEARNING_7H_RESULTS.md.',
    );
  }

  console.log('\nLearning 7H gates passed.');
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});