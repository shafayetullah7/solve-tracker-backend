import 'dotenv/config';
import assert from 'node:assert/strict';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { randomUUID } from 'node:crypto';

const target = process.env.TEST_DATABASE_URL;
if (!target || !new URL(target).pathname.endsWith('_test')) {
  throw new Error(
    'Provide a dedicated TEST_DATABASE_URL ending in _test; no application DATABASE_URL fallback is allowed.',
  );
}

const pool = new pg.Pool({ connectionString: target });
let count = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  count += 1;
};

const createdEmails = [];

async function insertUser(email, handle) {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO users (id, name, email, password_hash, handle)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, 'Handle Test', email, 'not-a-real-hash', handle],
  );
  createdEmails.push(email);
  return id;
}

try {
  await migrate(drizzle({ client: pool }), { migrationsFolder: './drizzle' });

  const email1 = `handle-test-1-${randomUUID()}@example.test`;
  await insertUser(email1, 'alpha_tester');
  check(true, 'insert handle alpha_tester');

  const email2 = `handle-test-2-${randomUUID()}@example.test`;
  let conflict = false;
  try {
    await insertUser(email2, 'Alpha_Tester');
  } catch (error) {
    conflict = error?.code === '23505';
  }
  check(conflict, 'case-variant handle violates unique index');

  let notNullEnforced = false;
  try {
    const email3 = `handle-test-3-${randomUUID()}@example.test`;
    const id = randomUUID();
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash)
       VALUES ($1, $2, $3, $4)`,
      [id, 'Handle Test', email3, 'not-a-real-hash'],
    );
  } catch (error) {
    notNullEnforced = error?.code === '23502';
  }
  check(notNullEnforced, 'handle column is NOT NULL');

  console.log(`user handle schema integration: ${count} checks passed`);
} finally {
  if (createdEmails.length > 0) {
    await pool.query('DELETE FROM users WHERE email = ANY($1::text[])', [
      createdEmails,
    ]);
  }
  await pool.end();
}