#!/usr/bin/env node
/**
 * USER-HANDLE H4 — fast regression (no TEST_DATABASE_URL).
 * CI-safe: static wiring, reserved list, OpenAPI drift greps, Vitest slice.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const backendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const frontendRoot = path.resolve(backendRoot, '..', 'solve-tracker-frontend');
let checks = 0;

function check(condition, message) {
  assert.ok(condition, message);
  checks += 1;
}

function checkMigrations() {
  const dirs = [
    'drizzle/20261118102214_add-user-handle',
    'drizzle/20261118103421_backfill-user-handle-not-null',
  ];
  for (const dir of dirs) {
    const sql = path.join(backendRoot, dir, 'migration.sql');
    check(fs.existsSync(sql), `migration present: ${dir}`);
  }
  const backfill = fs.readFileSync(
    path.join(
      backendRoot,
      'drizzle/20261118103421_backfill-user-handle-not-null/migration.sql',
    ),
    'utf8',
  );
  check(
    backfill.includes('SET NOT NULL') && backfill.includes('users_handle_lower_uniq'),
    'backfill migration sets NOT NULL and unique index',
  );
}

function checkUsersTable() {
  const text = fs.readFileSync(
    path.join(backendRoot, 'src/database/schema/users/users.table.ts'),
    'utf8',
  );
  check(text.includes('handle:'), 'users.table defines handle');
  check(text.includes('handleChangedAt'), 'users.table defines handleChangedAt');
  check(
    text.includes('users_handle_lower_uniq'),
    'users.table defines users_handle_lower_uniq',
  );
}

function checkReservedList() {
  const text = fs.readFileSync(
    path.join(backendRoot, 'src/common/schemas/user-handle.schema.ts'),
    'utf8',
  );
  const listMatch = text.match(
    /USER_HANDLE_RESERVED_LIST = \[([\s\S]*?)\] as const/,
  );
  check(listMatch, 'USER_HANDLE_RESERVED_LIST block found');
  const names = [...listMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  check(names.length === 32, `USER_HANDLE_RESERVED_LIST has 32 names (got ${names.length})`);
  check(
    names.includes('profile') && names.includes('register'),
    'reserved list includes profile and register',
  );
}

function checkStaticWiring() {
  const authSchema = fs.readFileSync(
    path.join(backendRoot, 'src/modules/auth/schemas/auth.schema.ts'),
    'utf8',
  );
  check(authSchema.includes('optionalUserHandleSchema'), 'register schema optional handle');

  const authService = fs.readFileSync(
    path.join(backendRoot, 'src/modules/auth/auth.service.ts'),
    'utf8',
  );
  check(authService.includes('handle'), 'auth.service references handle');

  const profileService = fs.readFileSync(
    path.join(backendRoot, 'src/modules/profile/profile.service.ts'),
    'utf8',
  );
  check(
    profileService.includes('HANDLE_IN_USE') ||
      profileService.includes('user-handle.errors'),
    'profile.service maps handle errors',
  );

  const openapi = fs.readFileSync(
    path.join(backendRoot, 'openapi.json'),
    'utf8',
  );
  check(openapi.includes('"handle"'), 'openapi.json documents handle');
  check(
    openapi.includes('/users/me/profile'),
    'openapi lists profile route for handle PATCH',
  );

  const authApi = fs.readFileSync(
    path.join(frontendRoot, 'src/lib/api/modules/auth.api.ts'),
    'utf8',
  );
  check(authApi.includes('handle'), 'frontend auth.api requires handle');

  const register = fs.readFileSync(
    path.join(frontendRoot, 'src/routes/register.tsx'),
    'utf8',
  );
  check(register.includes('handle'), 'register.tsx optional handle field');

  const profileAbout = fs.readFileSync(
    path.join(
      frontendRoot,
      'src/components/profile/ProfileAboutSection.tsx',
    ),
    'utf8',
  );
  check(
    profileAbout.includes('formatHandleLabel'),
    'profile about renders handle label',
  );
}

function runVitestUserHandle() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'pnpm',
      [
        'exec',
        'vitest',
        'run',
        'src/common/schemas/user-handle.schema.spec.ts',
        'src/common/schemas/user-handle-assign.spec.ts',
        'src/modules/auth/auth-handle.spec.ts',
        'src/modules/profile/profile.service.spec.ts',
      ],
      {
        cwd: backendRoot,
        stdio: 'inherit',
        shell: false,
        env: process.env,
      },
    );
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`vitest user-handle slice exited ${code}`)),
    );
  });
}

async function main() {
  if (!fs.existsSync(path.join(backendRoot, 'dist/app.module.js'))) {
    throw new Error('Missing dist/ — run pnpm build in solve-tracker-backend first.');
  }
  checkMigrations();
  checkUsersTable();
  checkReservedList();
  checkStaticWiring();
  await runVitestUserHandle();
  check(true, 'vitest user-handle slice passed');
  console.log(`OK: verify:user-handle (${checks} checks)`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});