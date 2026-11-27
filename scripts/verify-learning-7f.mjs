#!/usr/bin/env node
/**
 * Phase 7F — operations gates (safe logging audit + cumulative 7E + ops integration).
 * Optional OPS_LIVE=1: document-only operator probes (see LEARNING_7F_RESULTS.md).
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
  const live = process.env.OPS_LIVE === '1';
  const testDb = process.env.TEST_DATABASE_URL;
  if (!testDb || !new URL(testDb).pathname.endsWith('_test')) {
    throw new Error('TEST_DATABASE_URL ending in _test is required');
  }

  console.log('Learning 7F — safe logging audit …');
  await run('node', ['scripts/audit-learning-safe-logging.mjs']);

  console.log('Learning 7F — cumulative 7A–7E static gates …');
  await run('node', ['scripts/verify-learning-7e.mjs']);

  console.log('Learning 7F — ops integration …');
  await run('node', ['scripts/test-learning-ops-integration.mjs']);

  if (live) {
    const base = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
    const res = await fetch(`${base.replace(/\/$/, '')}/health/ready`);
    if (!res.ok) throw new Error(`OPS_LIVE health/ready failed: ${res.status}`);
    console.log('OPS_LIVE: GET /health/ready ok');
  }

  console.log('\nLearning 7F gates passed.');
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});