#!/usr/bin/env node
/**
 * Phase 7E — cumulative regression gates (learning hardening).
 * Set E2E_LIVE=1 for SSR smoke (requires frontend :3001 and TEST_DATABASE_URL for optional seed).
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
  const live = process.env.E2E_LIVE === '1';
  const testDb = process.env.TEST_DATABASE_URL;
  if (live && (!testDb || !new URL(testDb).pathname.endsWith('_test'))) {
    throw new Error('E2E_LIVE=1 requires TEST_DATABASE_URL ending in _test');
  }

  console.log('Learning 7E — backend static gates …');
  await run('pnpm', ['db:check']);
  await run('pnpm', ['lint']);
  await run('pnpm', ['test', '--run']);
  await run('pnpm', ['test:e2e']);
  await run('pnpm', ['build']);
  await run('pnpm', ['api:check']);

  console.log('Learning 7E — integration gates …');
  await run('node', ['scripts/test-learning-integration.mjs']);
  await run('node', ['scripts/test-learning-privacy-integration.mjs']);
  await run('node', ['scripts/benchmark-learning-reads.mjs', '--tier=ci', '--ci']);
  await run('node', ['scripts/rehearse-learning-migration-upgrade.mjs', '--ci']);
  await run('node', ['scripts/test-problems-integration.mjs']);
  await run('node', ['scripts/test-topics-integration.mjs']);

  console.log('Learning 7E — frontend static gates …');
  await run('pnpm', ['check'], frontendRoot);
  await run('pnpm', ['build'], frontendRoot);
  await run('pnpm', ['api:check'], frontendRoot);

  if (!live) {
    console.log('\nLearning 7E static gates passed (set E2E_LIVE=1 for SSR smoke).');
    return;
  }

  console.log('Learning 7E — live SSR smoke …');
  const baseUrl = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3001';
  await run('node', ['scripts/verify-ssr-2.mjs'], frontendRoot, {
    ...process.env,
    BASE_URL: baseUrl,
  });

  console.log('\nLearning 7E static + live gates passed.');
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});