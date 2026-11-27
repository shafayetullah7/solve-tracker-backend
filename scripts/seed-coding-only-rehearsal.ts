/**
 * Coding-only fixture for migration upgrade rehearsal (pre-learning schema).
 */
import 'dotenv/config';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../src/database/schema/index.js';
import { databaseEnvironmentSchema } from '../src/config/environment.js';
import { authTestEnvironment } from '../test/auth-env.js';
import { PLATFORM_SEED_ROWS } from '../src/shared/platform-catalog.js';
import { prepareProblemUrl } from '../src/modules/problems/problem-url.js';
import { storedPlatformSlugFromUrl } from '../src/modules/problems/problem-platform-slug.js';
import { prepareTopicName } from '../src/modules/topics/topic-name.js';

if (process.env.NODE_ENV === 'production') {
  console.error('refusing to run coding-only rehearsal seed in production');
  process.exit(1);
}

const REHEARSAL_EMAIL = 'rehearsal-coding@example.test';
const REHEARSAL_HANDLE = 'rehearsal_coding';
const REHEARSAL_PASSWORD = 'a long testing passphrase 🌱';

async function hashPassword(password: string) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: Number(authTestEnvironment.ARGON2_MEMORY_KIB),
    timeCost: Number(authTestEnvironment.ARGON2_TIME_COST),
    parallelism: Number(authTestEnvironment.ARGON2_PARALLELISM),
  });
}

const connectionString =
  process.env.MIGRATION_REHEARSAL_DATABASE_URL
  ?? process.env.TEST_DATABASE_URL
  ?? databaseEnvironmentSchema.parse(process.env).DATABASE_URL;

const pool = new pg.Pool({ connectionString });
const db = drizzle({ client: pool, relations: schema.relations });

try {
  const tableCheck = await pool.query(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'learning_guides'
    ) AS present`,
  );
  if (tableCheck.rows[0]?.present) {
    throw new Error('learning_guides exists — expected pre-learning schema only');
  }

  const existing = await db.select().from(schema.users).where(eq(schema.users.email, REHEARSAL_EMAIL));
  if (existing[0]) {
    await db.delete(schema.users).where(eq(schema.users.id, existing[0].id));
  }

  await db
    .insert(schema.platforms)
    .values(PLATFORM_SEED_ROWS)
    .onConflictDoNothing({ target: schema.platforms.slug });

  const userId = randomUUID();
  await db.insert(schema.users).values({
    id: userId,
    name: 'Rehearsal Coding',
    email: REHEARSAL_EMAIL,
    passwordHash: await hashPassword(REHEARSAL_PASSWORD),
    handle: REHEARSAL_HANDLE,
    practiceVisibility: 'private',
  });

  const topicIds: string[] = [];
  for (const name of ['Arrays rehearsal', 'Graphs rehearsal', 'DP rehearsal']) {
    const prepared = prepareTopicName(name);
    const [row] = await db
      .insert(schema.topics)
      .values({
        userId,
        name: prepared.name,
        normalizedName: prepared.normalizedName,
        isPublic: false,
        description: '',
      })
      .returning({ id: schema.topics.id });
    topicIds.push(row!.id);
  }

  const problemIds: string[] = [];
  for (let i = 0; i < 15; i += 1) {
    const url = `https://leetcode.com/problems/rehearsal-problem-${i}/`;
    const prepared = prepareProblemUrl(url);
    const status = i % 3 === 0 ? 'unsolved' : 'solved';
    const [row] = await db
      .insert(schema.problems)
      .values({
        userId,
        title: `Rehearsal problem ${i}`,
        url: prepared.url,
        normalizedUrl: prepared.normalizedUrl,
        platformSlug: storedPlatformSlugFromUrl(prepared.url),
        difficulty: 'Medium',
        status,
        solvedAt: status === 'solved' ? new Date() : null,
      })
      .returning({ id: schema.problems.id });
    problemIds.push(row!.id);
    await db.insert(schema.problemTopics).values({
      problemId: row!.id,
      topicId: topicIds[i % topicIds.length]!,
    });
  }

  const meta = {
    userId,
    email: REHEARSAL_EMAIL,
    password: REHEARSAL_PASSWORD,
    topicCount: topicIds.length,
    problemCount: problemIds.length,
    problemIds,
  };
  console.log(
    `Coding-only rehearsal seed complete (${meta.problemCount} problems, ${meta.topicCount} topics).`,
  );
  console.log(`REHEARSAL_FIXTURE_JSON=${JSON.stringify(meta)}`);
} finally {
  await pool.end();
}