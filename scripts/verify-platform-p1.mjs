#!/usr/bin/env node
/**
 * PLATFORM-CLS P1 — column, index, migrate idempotency, catalog backfill spot-check.
 * Requires TEST_DATABASE_URL ending in _test.
 */
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const target = process.env.TEST_DATABASE_URL;
if (!target || !new URL(target).pathname.endsWith('_test')) {
  throw new Error(
    'Set TEST_DATABASE_URL to a dedicated database whose name ends in _test.',
  );
}

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

const pool = new pg.Pool({ connectionString: target });
const fixtureUserId = randomUUID();
const problemIds = [];
const tag = randomUUID();

try {
  console.log('P1 verify — drizzle metadata …');
  await run('pnpm', ['db:check']);
  console.log('P1 verify — build …');
  await run('pnpm', ['build']);

  console.log('P1 verify — migrate twice (idempotent) …');
  await migrate(drizzle({ client: pool }), { migrationsFolder: './drizzle' });
  await migrate(drizzle({ client: pool }), { migrationsFolder: './drizzle' });

  const index = await pool.query(
    `SELECT 1 FROM pg_indexes WHERE tablename = 'problems' AND indexname = $1`,
    ['problems_user_platform_slug_idx'],
  );
  assert.equal(index.rowCount, 1, 'expected problems_user_platform_slug_idx');

  const column = await pool.query(
    `SELECT column_name, column_default, is_nullable
     FROM information_schema.columns
     WHERE table_name = 'problems' AND column_name = 'platform_slug'`,
  );
  assert.equal(column.rowCount, 1, 'platform_slug column missing');
  assert.equal(column.rows[0].is_nullable, 'NO');

  await pool.query(
    `INSERT INTO users (id, name, email, password_hash)
     VALUES ($1, $2, $3, $4)`,
    [fixtureUserId, 'P1 Verify', `p1-verify-${tag}@example.test`, 'unused-hash'],
  );

  const fixtures = [
    {
      title: 'LC fixture',
      url: `https://leetcode.com/problems/p1-${tag}/`,
      expected: 'leetcode',
    },
    {
      title: 'CF fixture',
      url: `https://codeforces.com/problemset/problem/1/A-${tag}`,
      expected: 'codeforces',
    },
    {
      title: 'Other fixture',
      url: `https://example.com/p/${tag}`,
      expected: 'other',
    },
  ];

  for (const row of fixtures) {
    const id = randomUUID();
    problemIds.push(id);
    await pool.query(
      `INSERT INTO problems (id, user_id, title, url, normalized_url)
       VALUES ($1, $2, $3, $4, $4)`,
      [id, fixtureUserId, row.title, row.url],
    );
  }

  console.log('P1 verify — backfill script …');
  await run(
    'pnpm',
    ['exec', 'tsx', '--import', 'dotenv/config', 'scripts/backfill-problem-platform-slugs.ts'],
    backendRoot,
    { ...process.env, DATABASE_URL: target },
  );

  for (let i = 0; i < fixtures.length; i++) {
    const row = fixtures[i];
    const { rows } = await pool.query(
      `SELECT platform_slug FROM problems WHERE id = $1`,
      [problemIds[i]],
    );
    assert.equal(
      rows[0].platform_slug,
      row.expected,
      `slug for ${row.url}`,
    );
  }

  console.log('P1 verify — problems integration regression …');
  await run('pnpm', ['test:problems:integration'], backendRoot, {
    ...process.env,
    TEST_DATABASE_URL: target,
  });

  console.log('P1 verify — PASS');
} finally {
  if (problemIds.length > 0) {
    await pool.query(`DELETE FROM problems WHERE id = ANY($1::uuid[])`, [
      problemIds,
    ]);
  }
  await pool.query(`DELETE FROM users WHERE id = $1`, [fixtureUserId]);
  await pool.end();
}