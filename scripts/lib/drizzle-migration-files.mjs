import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

export const PRE_LEARNING_CUTOFF = '20261118174855_discover-e9-public-safety';

function formatToMillis(date) {
  const year = date.slice(0, 4);
  const month = date.slice(4, 6);
  const day = date.slice(6, 8);
  const hour = date.slice(8, 10);
  const minute = date.slice(10, 12);
  const second = date.slice(12, 14);
  return Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
}

/**
 * @param {string} migrationsFolder
 * @returns {{ name: string, path: string }[]}
 */
export function listMigrationFolders(migrationsFolder = './drizzle') {
  return readdirSync(migrationsFolder)
    .filter((name) => existsSync(join(migrationsFolder, name, 'migration.sql')))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ name, path: join(migrationsFolder, name, 'migration.sql') }));
}

/**
 * @param {string} migrationsFolder
 * @returns {import('drizzle-orm/migrator').MigrationMeta[]}
 */
export function readMigrationsMeta(migrationsFolder = './drizzle') {
  return listMigrationFolders(migrationsFolder).map(({ name, path }) => {
    const query = readFileSync(path, 'utf8');
    const sql = query
      .split('--> statement-breakpoint')
      .map((stmt) => stmt.trim())
      .filter(Boolean);
    const migrationDate = name.slice(0, 14);
    return {
      sql,
      bps: true,
      folderMillis: formatToMillis(migrationDate),
      hash: createHash('sha256').update(query).digest('hex'),
      name,
    };
  });
}

/**
 * @param {string} migrationsFolder
 * @param {string} cutoffName inclusive pre-learning folder name
 */
export function splitPreAndLearning(migrationsFolder = './drizzle', cutoffName = PRE_LEARNING_CUTOFF) {
  const all = readMigrationsMeta(migrationsFolder);
  const pre = [];
  const learning = [];
  for (const migration of all) {
    if (migration.name.localeCompare(cutoffName) <= 0) pre.push(migration);
    else learning.push(migration);
  }
  return { pre, learning, total: all.length };
}

/**
 * @param {import('pg').PoolClient} client
 * @param {ReturnType<typeof readMigrationsMeta>[number][]} migrations
 */
export async function applyMigrationsJournal(client, migrations) {
  await client.query('CREATE SCHEMA IF NOT EXISTS drizzle');
  await client.query(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint,
      name text,
      applied_at timestamp with time zone DEFAULT now()
    )
  `);
  for (const migration of migrations) {
    await client.query('BEGIN');
    try {
      for (const stmt of migration.sql) {
        if (stmt) await client.query(stmt);
      }
      await client.query(
        `INSERT INTO drizzle.__drizzle_migrations (hash, created_at, name)
         VALUES ($1, $2, $3)`,
        [migration.hash, migration.folderMillis, migration.name],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
}