#!/usr/bin/env node
/**
 * DISCOVER launch gate (E7) — runs verify-discover-e1 … e6, then optional Playwright discover suite.
 *
 * Requires TEST_DATABASE_URL ending in _test.
 *
 * Playwright (skipped when SKIP_DISCOVER_E2E=1):
 *   - E2E_DISCOVER_SEED=1
 *   - API + frontend running; PHASE_47_BASE_URL (default http://localhost:3001)
 *   - DISCOVER_MODE=full on API; VITE_DISCOVER_MODE=full on frontend build
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

async function canReach(baseUrl) {
  try {
    const res = await fetch(baseUrl, { signal: AbortSignal.timeout(3_000) });
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
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

if (process.env.SKIP_DISCOVER_E2E === '1') {
  console.warn(
    '\nDISCOVER — SKIP_DISCOVER_E2E=1; skipping Playwright discover suite.',
  );
} else {
  const baseURL =
    process.env.PHASE_47_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:3001';
  const reachable = await canReach(baseURL);
  if (!reachable) {
    console.warn(
      `\nDISCOVER — WARN: ${baseURL} not reachable; skipping Playwright. ` +
        'Start API + frontend, set E2E_DISCOVER_SEED=1, or set SKIP_DISCOVER_E2E=1.',
    );
  } else {
    console.log('\nDISCOVER — Playwright discover suite …');
    await run(
      'pnpm',
      [
        'exec',
        'playwright',
        'test',
        '-c',
        'e2e/playwright.config.ts',
        '-g',
        'discover',
      ],
      frontendRoot,
      {
        ...env,
        E2E_DISCOVER_SEED: process.env.E2E_DISCOVER_SEED ?? '1',
        PHASE_47_BASE_URL: baseURL,
      },
    );
  }
}

console.log('\nDISCOVER — verify:discover PASS');