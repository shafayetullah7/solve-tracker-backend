import 'reflect-metadata';
import 'dotenv/config';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import {
  splitPreAndLearning,
  applyMigrationsJournal,
  PRE_LEARNING_CUTOFF,
} from './lib/drizzle-migration-files.mjs';

const ciMode = process.argv.includes('--ci');
const skipRestoreFlag =
  ciMode
  || process.argv.includes('--skip-restore')
  || process.env.LEARNING_MIGRATION_REHEARSAL_SKIP_RESTORE === '1';

function pgClientToolsAvailable() {
  const dump = spawnSync('pg_dump', ['--version'], { stdio: 'ignore' });
  const restore = spawnSync('pg_restore', ['--version'], { stdio: 'ignore' });
  return dump.status === 0 && restore.status === 0;
}

function resolveRehearsalUrl() {
  if (process.env.MIGRATION_REHEARSAL_DATABASE_URL) {
    return process.env.MIGRATION_REHEARSAL_DATABASE_URL;
  }
  const test = process.env.TEST_DATABASE_URL;
  if (!test) throw new Error('Set TEST_DATABASE_URL or MIGRATION_REHEARSAL_DATABASE_URL');
  const u = new URL(test);
  const name = u.pathname.replace(/^\//, '');
  if (!name.endsWith('_test') && !name.endsWith('_rehearsal')) {
    throw new Error('Rehearsal database name must end in _test or _rehearsal');
  }
  u.pathname = '/practice_tracker_rehearsal';
  return u.toString();
}

function adminUrl(dbUrl) {
  const u = new URL(dbUrl);
  u.pathname = '/postgres';
  return u.toString();
}

function quoteIdent(name) {
  return `"${name.replace(/"/g, '""')}"`;
}

async function ensureDatabase(dbUrl) {
  const u = new URL(dbUrl);
  const dbName = u.pathname.slice(1);
  const admin = new pg.Pool({ connectionString: adminUrl(dbUrl) });
  try {
    await admin.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [dbName],
    );
    await admin.query(`DROP DATABASE IF EXISTS ${quoteIdent(dbName)}`);
    await admin.query(`CREATE DATABASE ${quoteIdent(dbName)}`);
  } finally {
    await admin.end();
  }
}

async function resetSchema(pool) {
  await pool.query('DROP SCHEMA IF EXISTS public CASCADE');
  await pool.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
  await pool.query('CREATE SCHEMA public');
  await pool.query('GRANT ALL ON SCHEMA public TO public');
}

async function tableCounts(pool, userId) {
  const [users, problems, topics] = await Promise.all([
    pool.query('SELECT count(*)::int AS c FROM users'),
    pool.query('SELECT count(*)::int AS c FROM problems WHERE user_id = $1::uuid', [userId]),
    pool.query('SELECT count(*)::int AS c FROM topics WHERE user_id = $1::uuid', [userId]),
  ]);
  const learning = await pool.query(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'learning_guides'
    ) AS present`,
  );
  return {
    users: users.rows[0].c,
    problems: problems.rows[0].c,
    topics: topics.rows[0].c,
    learningGuidesTable: learning.rows[0].present,
  };
}

const rehearsalUrl = resolveRehearsalUrl();
const { pre, learning, total } = splitPreAndLearning('./drizzle');
assert.equal(total, 26, `expected 26 migrations, got ${total}`);
assert.equal(pre.length, 17, `expected 17 pre-learning migrations, got ${pre.length}`);
assert.equal(learning.length, 9, `expected 9 learning migrations, got ${learning.length}`);
assert.equal(pre[pre.length - 1]?.name, PRE_LEARNING_CUTOFF);

console.log(`Migration rehearsal on ${new URL(rehearsalUrl).pathname.slice(1)} (ci=${ciMode})`);

await ensureDatabase(rehearsalUrl);
const pool = new pg.Pool({ connectionString: rehearsalUrl });
let fixture = {};

try {
  await resetSchema(pool);
  const client = await pool.connect();
  try {
    console.log(`Applying ${pre.length} pre-learning migrations…`);
    await applyMigrationsJournal(client, pre);
  } finally {
    client.release();
  }

  const seedOut = execFileSync(
    'pnpm',
    ['exec', 'tsx', 'scripts/seed-coding-only-rehearsal.ts'],
    {
      encoding: 'utf8',
      env: { ...process.env, MIGRATION_REHEARSAL_DATABASE_URL: rehearsalUrl, DATABASE_URL: rehearsalUrl },
    },
  );
  const fixtureLine = seedOut.split('\n').find((line) => line.startsWith('REHEARSAL_FIXTURE_JSON='));
  assert.ok(fixtureLine, 'seed must emit REHEARSAL_FIXTURE_JSON');
  fixture = JSON.parse(fixtureLine.replace('REHEARSAL_FIXTURE_JSON=', ''));
  const beforeCounts = await tableCounts(pool, fixture.userId);
  assert.equal(beforeCounts.problems, fixture.problemCount);
  assert.equal(beforeCounts.topics, fixture.topicCount);
  assert.equal(beforeCounts.learningGuidesTable, false);

  const db = drizzle({ client: pool });
  console.log('Running drizzle migrate (learning batch)…');
  await migrate(db, { migrationsFolder: './drizzle' });
  await migrate(db, { migrationsFolder: './drizzle' });

  const afterCounts = await tableCounts(pool, fixture.userId);
  assert.equal(afterCounts.problems, beforeCounts.problems, 'problems count after upgrade');
  assert.equal(afterCounts.topics, beforeCounts.topics, 'topics count after upgrade');
  assert.equal(afterCounts.users, beforeCounts.users, 'users count after upgrade');
  assert.equal(afterCounts.learningGuidesTable, true, 'learning_guides table must exist');

  const journal = await pool.query('SELECT count(*)::int AS c FROM drizzle.__drizzle_migrations');
  assert.equal(journal.rows[0].c, total, 'all migrations recorded');

  const skipRestore = skipRestoreFlag || !pgClientToolsAvailable();
  if (!skipRestore) {
    const dumpDir = join(process.cwd(), 'scripts', '.rehearsal');
    if (!existsSync(dumpDir)) mkdirSync(dumpDir, { recursive: true });
    const dumpPath = join(dumpDir, 'rehearsal.dump');
    const restoredUrl = new URL(rehearsalUrl);
    restoredUrl.pathname = '/practice_tracker_rehearsal_restored';
    await ensureDatabase(restoredUrl.toString());

    execFileSync('pg_dump', ['-Fc', '-f', dumpPath, rehearsalUrl], { stdio: 'inherit' });
    execFileSync(
      'pg_restore',
      ['--no-owner', '--clean', '--if-exists', '-d', restoredUrl.toString(), dumpPath],
      { stdio: 'inherit' },
    );

    const restorePool = new pg.Pool({ connectionString: restoredUrl.toString() });
    try {
      const restoredCounts = await tableCounts(restorePool, fixture.userId);
      assert.deepEqual(restoredCounts.problems, afterCounts.problems);
      assert.deepEqual(restoredCounts.topics, afterCounts.topics);
      assert.equal(restoredCounts.learningGuidesTable, true);
      console.log('pg_restore verification passed.');
    } finally {
      await restorePool.end();
    }
  } else {
    const reason = skipRestoreFlag
      ? 'ci or --skip-restore'
      : 'pg_dump/pg_restore not in PATH';
    console.log(`Skipping pg_dump/pg_restore (${reason}).`);
  }

  console.log('Migration upgrade rehearsal passed.');
} finally {
  await pool.end();
}