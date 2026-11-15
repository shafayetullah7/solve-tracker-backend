#!/usr/bin/env node
/**
 * Phase 9 codebase gate — production config schema, health probes, build/tests.
 * Does not deploy or require production secrets; uses fixture validation only.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(command, args, cwd = backendRoot) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: false,
      env: process.env,
    });
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${command} ${args.join(' ')} exited ${code}`)),
    );
  });
}

function checkHealthModule() {
  const controller = path.join(
    backendRoot,
    'src/modules/health/health.controller.ts',
  );
  const module = path.join(backendRoot, 'src/modules/health/health.module.ts');
  if (!fs.existsSync(controller) || !fs.existsSync(module))
    throw new Error('Missing health module');
  const text = fs.readFileSync(controller, 'utf8');
  if (!text.includes("live()") || !text.includes("ready()"))
    throw new Error('Health controller must expose live and ready handlers');
  console.log('OK: /health and /health/ready module present');
}

async function main() {
  checkHealthModule();
  console.log('Phase 9 — unit tests (environment + health) …');
  await run('pnpm', ['test']);
  console.log('Phase 9 — HTTP e2e (health) …');
  await run('pnpm', ['test:e2e']);
  console.log('Phase 9 — build + OpenAPI drift …');
  await run('pnpm', ['build']);
  await run('pnpm', ['api:check']);
  console.log('\nPhase 9 codebase gate passed.');
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});