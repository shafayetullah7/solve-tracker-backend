/**
 * Learning performance fixture (dev/test only). Idempotent for perf-learning user.
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
import { learningAttemptStatus } from '../src/database/schema/learning/learning-attempt-status.enum.js';
import { learningNodeCompletionMode } from '../src/database/schema/learning/learning-node-completion-mode.enum.js';
import { MAX_NODES } from '../src/modules/learning/learning-hierarchy.js';

if (process.env.NODE_ENV === 'production') {
  console.error('refusing to run learning perf seed in production');
  process.exit(1);
}

const PERF_EMAIL = 'perf-learning@example.test';
const PERF_HANDLE = 'perf-learning';
const PERF_PASSWORD = 'a long testing passphrase 🌱';

type Tier = 'ci' | 'large' | 'stress';

function parseTier(argv: string[]): Tier {
  const flag = argv.find((a) => a.startsWith('--tier='))?.split('=')[1]
    ?? (argv.includes('--tier') ? argv[argv.indexOf('--tier') + 1] : undefined)
    ?? 'ci';
  if (flag === 'stress') {
    if (process.env.LEARNING_PERF_STRESS !== '1') {
      throw new Error('Stress tier requires LEARNING_PERF_STRESS=1');
    }
    return 'stress';
  }
  if (flag === 'large' || flag === 'ci') return flag;
  throw new Error(`Unknown tier: ${flag}`);
}

const tierConfigs: Record<Tier, { guides: number; primaryNodes: number; assessments: number; attemptsPer: number; fillerNodes: number }> = {
  ci: { guides: 10, primaryNodes: 100, assessments: 2, attemptsPer: 5, fillerNodes: 1 },
  large: { guides: 10, primaryNodes: 500, assessments: 5, attemptsPer: 20, fillerNodes: 1 },
  stress: { guides: 1, primaryNodes: MAX_NODES, assessments: 10, attemptsPer: 5, fillerNodes: 0 },
};

async function hashPassword(password: string) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: Number(authTestEnvironment.ARGON2_MEMORY_KIB),
    timeCost: Number(authTestEnvironment.ARGON2_TIME_COST),
    parallelism: Number(authTestEnvironment.ARGON2_PARALLELISM),
  });
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

const connectionString =
  process.env.TEST_DATABASE_URL
  ?? databaseEnvironmentSchema.parse(process.env).DATABASE_URL;
if (!connectionString.includes('_test') && !connectionString.includes('test')) {
  console.warn('learning perf seed: DATABASE_URL does not look like a test database');
}

const pool = new pg.Pool({ connectionString });
const db = drizzle({ client: pool, relations: schema.relations });

const tier = parseTier(process.argv.slice(2));
const config = tierConfigs[tier];

try {
  const existing = await db.select().from(schema.users).where(eq(schema.users.email, PERF_EMAIL));
  if (existing[0]) {
    await db.delete(schema.users).where(eq(schema.users.id, existing[0].id));
  }

  const userId = randomUUID();
  const passwordHash = await hashPassword(PERF_PASSWORD);
  await db.insert(schema.users).values({
    id: userId,
    name: 'Learning Perf',
    email: PERF_EMAIL,
    passwordHash,
    handle: PERF_HANDLE,
    practiceVisibility: 'private',
  });

  const primaryGuideId = randomUUID();
  const guideRows: schema.NewLearningGuide[] = [
    {
      id: primaryGuideId,
      ownerId: userId,
      title: 'Perf primary guide',
      description: 'Synthetic tree for 7C',
      structureRevision: 1n,
      metadataRevision: 1n,
      updatedAt: new Date(),
    },
  ];
  for (let g = 1; g < config.guides; g += 1) {
    guideRows.push({
      id: randomUUID(),
      ownerId: userId,
      title: `Perf filler guide ${g}`,
      description: '',
      structureRevision: 1n,
      metadataRevision: 1n,
      updatedAt: new Date(Date.now() - g * 1000),
    });
  }
  await db.insert(schema.learningGuides).values(guideRows);

  const primaryNodeIds: string[] = [];
  const nodeValues: schema.NewLearningNode[] = [];
  for (let i = 0; i < config.primaryNodes; i += 1) {
    const id = randomUUID();
    primaryNodeIds.push(id);
    nodeValues.push({
      id,
      guideId: primaryGuideId,
      parentId: null,
      title: `Step ${i + 1}`,
      position: i,
      required: true,
      completionMode: learningNodeCompletionMode.Structural,
      contentRevision: 1n,
      requirementRevision: 1n,
    });
  }
  for (const batch of chunk(nodeValues, 250)) {
    await db.insert(schema.learningNodes).values(batch);
  }

  for (const guide of guideRows.slice(1)) {
    if (config.fillerNodes < 1) continue;
    await db.insert(schema.learningNodes).values({
      id: randomUUID(),
      guideId: guide.id!,
      parentId: null,
      title: 'Only step',
      position: 0,
      required: true,
      completionMode: learningNodeCompletionMode.Structural,
      contentRevision: 1n,
      requirementRevision: 1n,
    });
  }

  const enrollmentId = randomUUID();
  await db.insert(schema.learningEnrollments).values({
    id: enrollmentId,
    guideId: primaryGuideId,
    learnerId: userId,
    resumeNodeId: primaryNodeIds[0] ?? null,
    lastActivityAt: new Date(),
  });

  const progressRows: schema.NewLearningNodeProgress[] = [];
  const completedThrough = Math.floor(config.primaryNodes / 2);
  for (let i = 0; i < completedThrough; i += 1) {
    progressRows.push({
      id: randomUUID(),
      enrollmentId,
      guideId: primaryGuideId,
      nodeId: primaryNodeIds[i]!,
    });
  }
  for (const batch of chunk(progressRows, 250)) {
    await db.insert(schema.learningNodeProgress).values(batch);
  }

  let primaryAssessmentId = '';
  let primaryAttemptId = '';
  let primaryQuestionId = '';

  for (let a = 0; a < config.assessments; a += 1) {
    const assessmentId = randomUUID();
    const revisionId = randomUUID();
    const questionId = randomUUID();
    if (a === 0) {
      primaryAssessmentId = assessmentId;
      primaryQuestionId = questionId;
    }

    await db.insert(schema.learningAssessments).values({
      id: assessmentId,
      guideId: primaryGuideId,
      title: `Perf quiz ${a + 1}`,
      activeRevisionId: null,
    });
    await db.insert(schema.learningAssessmentRevisions).values({
      id: revisionId,
      guideId: primaryGuideId,
      assessmentId,
      revisionNumber: 1,
      passingBasisPoints: 5000,
    });
    await db
      .update(schema.learningAssessments)
      .set({ activeRevisionId: revisionId, updatedAt: new Date() })
      .where(eq(schema.learningAssessments.id, assessmentId));
    await db.insert(schema.learningQuestions).values({
      id: questionId,
      guideId: primaryGuideId,
      assessmentId,
      revisionId,
      position: 0,
      kind: 'single_choice',
      prompt: { stem: 'Pick', options: [{ id: 'o1', label: 'A' }] },
      gradingConfig: { correctOptionId: 'o1' },
      points: 1,
    });

    for (let t = 0; t < config.attemptsPer; t += 1) {
      const attemptId = randomUUID();
      if (a === 0 && t === 0) primaryAttemptId = attemptId;
      const now = new Date();
      await db.insert(schema.learningAttempts).values({
        id: attemptId,
        guideId: primaryGuideId,
        enrollmentId,
        assessmentId,
        revisionId,
        status: learningAttemptStatus.Finalized,
        submittedAt: now,
        finalizedAt: now,
        earnedPoints: 1,
        possiblePoints: 1,
        scoreBasisPoints: 10000,
      });
      await db.insert(schema.learningAnswers).values({
        attemptId,
        questionId,
        revisionId,
        response: { selectedOptionId: 'o1' },
        awardedPoints: 1,
      });
    }
  }

  for (const guide of guideRows.slice(1)) {
    await db.insert(schema.learningEnrollments).values({
      id: randomUUID(),
      guideId: guide.id!,
      learnerId: userId,
    });
  }

  const meta = {
    tier,
    userId,
    email: PERF_EMAIL,
    password: PERF_PASSWORD,
    primaryGuideId,
    primaryAssessmentId,
    primaryAttemptId,
    primaryQuestionId,
    guideCount: config.guides,
    primaryNodeCount: config.primaryNodes,
  };
  console.log(`Learning perf seed complete (tier=${tier}, nodes=${config.primaryNodes}, guides=${config.guides}).`);
  console.log(`PERF_FIXTURE_JSON=${JSON.stringify(meta)}`);
} finally {
  await pool.end();
}