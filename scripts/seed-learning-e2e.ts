/**
 * Learning manual staging fixture (dev/test only).
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
import { learningNodeCompletionMode } from '../src/database/schema/learning/learning-node-completion-mode.enum.js';

if (process.env.NODE_ENV === 'production') {
  console.error('refusing to run learning e2e seed in production');
  process.exit(1);
}

export const E2E_LEARNING_EMAIL = 'e2e-learning@example.test';
export const E2E_LEARNING_HANDLE = 'e2e_learning';
export const E2E_LEARNING_PASSWORD = 'a long testing passphrase 🌱';
const NODE_TITLE = 'E2E study step';

async function hashPassword(password: string) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: Number(authTestEnvironment.ARGON2_MEMORY_KIB),
    timeCost: Number(authTestEnvironment.ARGON2_TIME_COST),
    parallelism: Number(authTestEnvironment.ARGON2_PARALLELISM),
  });
}

const connectionString =
  process.env.TEST_DATABASE_URL
  ?? databaseEnvironmentSchema.parse(process.env).DATABASE_URL;

const pool = new pg.Pool({ connectionString });
const db = drizzle({ client: pool, relations: schema.relations });

try {
  const existing = await db.select().from(schema.users).where(eq(schema.users.email, E2E_LEARNING_EMAIL));
  if (existing[0]) {
    await db.delete(schema.users).where(eq(schema.users.id, existing[0].id));
  }

  const userId = randomUUID();
  const guideId = randomUUID();
  const nodeId = randomUUID();
  const blockId = randomUUID();
  const guideTitle = 'E2E learning guide';

  await db.insert(schema.users).values({
    id: userId,
    name: 'E2E Learning',
    email: E2E_LEARNING_EMAIL,
    passwordHash: await hashPassword(E2E_LEARNING_PASSWORD),
    handle: E2E_LEARNING_HANDLE,
    practiceVisibility: 'private',
  });

  await db.insert(schema.learningGuides).values({
    id: guideId,
    ownerId: userId,
    title: guideTitle,
    description: 'Playwright smoke',
    structureRevision: 2n,
    metadataRevision: 1n,
  });

  await db.insert(schema.learningNodes).values({
    id: nodeId,
    guideId,
    parentId: null,
    title: NODE_TITLE,
    position: 0,
    required: true,
    completionMode: learningNodeCompletionMode.Structural,
    contentRevision: 2n,
    requirementRevision: 1n,
  });

  await db.insert(schema.learningBlocks).values({
    id: blockId,
    guideId,
    nodeId,
    position: 0,
    type: 'text',
    payload: { body: 'E2E study body marker' },
    schemaVersion: 1,
    activityRevision: 1n,
  });

  const enrollmentId = randomUUID();
  await db.insert(schema.learningEnrollments).values({
    id: enrollmentId,
    guideId,
    learnerId: userId,
    resumeNodeId: nodeId,
    lastActivityAt: new Date(),
  });

  const meta = {
    email: E2E_LEARNING_EMAIL,
    password: E2E_LEARNING_PASSWORD,
    userId,
    guideId,
    nodeId,
    guideTitle,
    nodeTitle: NODE_TITLE,
    studyPath: `/app/learning/${guideId}/study/${nodeId}`,
    libraryPath: '/app/learning',
  };
  console.log('Learning E2E seed complete.');
  console.log(`E2E_LEARNING_JSON=${JSON.stringify(meta)}`);
} finally {
  await pool.end();
}