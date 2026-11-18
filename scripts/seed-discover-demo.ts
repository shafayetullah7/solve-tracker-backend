/**
 * Discover demo seed (dev/test only). Idempotent for demo-* users.
 */
import 'dotenv/config';
import * as argon2 from 'argon2';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { and, eq, inArray, or } from 'drizzle-orm';
import * as schema from '../src/database/schema/index.js';
import { databaseEnvironmentSchema } from '../src/config/environment.js';
import { authTestEnvironment } from '../test/auth-env.js';
import { prepareProblemUrl } from '../src/modules/problems/problem-url.js';
import { storedPlatformSlugFromUrl } from '../src/modules/problems/problem-platform-slug.js';
import { prepareTopicName } from '../src/modules/topics/topic-name.js';

if (process.env.NODE_ENV === 'production') {
  console.error('refusing to run discover demo seed in production');
  process.exit(1);
}

const parsed = databaseEnvironmentSchema.safeParse(process.env);
if (!parsed.success) throw new Error('DATABASE_URL must be set.');
const pool = new pg.Pool({ connectionString: parsed.data.DATABASE_URL });
const db = drizzle({ client: pool, relations: schema.relations });

const DEMO_VIEWER_EMAIL = 'demo-viewer@discover.test';
const DEMO_VIEWER_PASSWORD = 'demo-password-1';
const DEMO_VIEWER_HANDLE = 'demo-viewer';

const SHARED_PROBLEM_URL = 'https://leetcode.com/problems/two-sum/';

async function hashPassword(password: string) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: Number(authTestEnvironment.ARGON2_MEMORY_KIB),
    timeCost: Number(authTestEnvironment.ARGON2_TIME_COST),
    parallelism: Number(authTestEnvironment.ARGON2_PARALLELISM),
  });
}

async function upsertDemoUser(input: {
  email: string;
  handle: string;
  name: string;
  password?: string;
  practiceVisibility: 'private' | 'summary' | 'topics';
  practiceGoal?: string | null;
}) {
  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, input.email))
    .limit(1);
  const passwordHash = input.password ? await hashPassword(input.password) : null;
  if (existing[0]) {
    await db
      .update(schema.users)
      .set({
        name: input.name,
        handle: input.handle,
        practiceVisibility: input.practiceVisibility,
        practiceGoal: input.practiceGoal ?? null,
        publicWeb: false,
        updatedAt: new Date(),
        ...(passwordHash ? { passwordHash } : {}),
      })
      .where(eq(schema.users.id, existing[0].id));
    return existing[0].id;
  }
  const [row] = await db
    .insert(schema.users)
    .values({
      name: input.name,
      email: input.email,
      handle: input.handle,
      passwordHash,
      practiceVisibility: input.practiceVisibility,
      practiceGoal: input.practiceGoal ?? null,
      publicWeb: false,
    })
    .returning({ id: schema.users.id });
  return row!.id;
}

async function ensureTopic(
  userId: string,
  name: string,
  isPublic: boolean,
  description = '',
) {
  const { normalizedName } = prepareTopicName(name);
  const existing = await db
    .select()
    .from(schema.topics)
    .where(eq(schema.topics.userId, userId))
    .limit(100);
  const match = existing.find((t) => t.normalizedName === normalizedName);
  if (match) {
    await db
      .update(schema.topics)
      .set({ isPublic, description, name, updatedAt: new Date() })
      .where(eq(schema.topics.id, match.id));
    return match.id;
  }
  const [row] = await db
    .insert(schema.topics)
    .values({
      userId,
      name,
      normalizedName,
      isPublic,
      description,
    })
    .returning({ id: schema.topics.id });
  return row!.id;
}

async function ensureProblem(
  userId: string,
  topicId: string,
  title: string,
  url: string,
  extra?: { difficulty?: string; status?: 'solved' | 'unsolved' },
) {
  const prepared = prepareProblemUrl(url);
  const existing = await db
    .select({ id: schema.problems.id })
    .from(schema.problems)
    .where(
      and(
        eq(schema.problems.userId, userId),
        eq(schema.problems.normalizedUrl, prepared.normalizedUrl),
      ),
    )
    .limit(1);
  let problemId = existing[0]?.id;
  if (!problemId) {
    const status = extra?.status ?? 'solved';
    const [row] = await db
      .insert(schema.problems)
      .values({
        userId,
        title,
        url: prepared.url,
        normalizedUrl: prepared.normalizedUrl,
        platformSlug: storedPlatformSlugFromUrl(prepared.url),
        difficulty: extra?.difficulty ?? 'Easy',
        status,
        solvedAt: status === 'solved' ? new Date() : null,
      })
      .returning({ id: schema.problems.id });
    problemId = row!.id;
  }
  const link = await db
    .select()
    .from(schema.problemTopics)
    .where(eq(schema.problemTopics.problemId, problemId))
    .limit(10);
  if (!link.some((l) => l.topicId === topicId)) {
    await db.insert(schema.problemTopics).values({ problemId, topicId });
  }
}

try {
  const viewerId = await upsertDemoUser({
    email: DEMO_VIEWER_EMAIL,
    handle: DEMO_VIEWER_HANDLE,
    name: 'Demo viewer',
    password: DEMO_VIEWER_PASSWORD,
    practiceVisibility: 'private',
    practiceGoal: null,
  });

  const matrix: {
    handle: string;
    visibility: 'private' | 'summary' | 'topics';
    goal: string | null;
  }[] = [
    { handle: 'demo-private', visibility: 'private', goal: null },
    { handle: 'demo-summary', visibility: 'summary', goal: 'interview' },
    { handle: 'demo-topics', visibility: 'topics', goal: 'contests' },
    { handle: 'demo-trap', visibility: 'private', goal: null },
  ];

  const userIds: Record<string, string> = { 'demo-viewer': viewerId };

  async function resetDemoSafetyState(ids: string[]) {
    if (ids.length === 0) return;
    await db
      .delete(schema.userBlocks)
      .where(
        or(
          inArray(schema.userBlocks.blockerId, ids),
          inArray(schema.userBlocks.blockedId, ids),
        ),
      );
    await db
      .update(schema.users)
      .set({ publicWeb: false })
      .where(inArray(schema.users.id, ids));
  }

  for (const entry of matrix) {
    userIds[entry.handle] = await upsertDemoUser({
      email: `${entry.handle}@discover.test`,
      handle: entry.handle,
      name: entry.handle,
      password: 'demo-password-1',
      practiceVisibility: entry.visibility,
      practiceGoal: entry.goal,
    });
  }

  await resetDemoSafetyState(Object.values(userIds));

  const summaryDp = await ensureTopic(userIds['demo-summary']!, 'DP', false);
  const summarySeeds = [
    ['Climbing Stairs', 'https://leetcode.com/problems/climbing-stairs/'],
    ['House Robber', 'https://leetcode.com/problems/house-robber/'],
    ['Min Cost Climbing Stairs', 'https://leetcode.com/problems/min-cost-climbing-stairs/'],
    ['Decode Ways', 'https://leetcode.com/problems/decode-ways/'],
    ['Unique Paths', 'https://leetcode.com/problems/unique-paths/'],
  ] as const;
  for (const [title, url] of summarySeeds) {
    await ensureProblem(userIds['demo-summary']!, summaryDp, title, url, {
      difficulty: 'Easy',
    });
  }

  const topicsPublic = await ensureTopic(
    userIds['demo-topics']!,
    'Dynamic Programming',
    true,
    'Public DP list for discover tests.',
  );
  const topicsPrivate = await ensureTopic(userIds['demo-topics']!, 'Strings', false);
  await ensureProblem(
    userIds['demo-topics']!,
    topicsPublic,
    'Two Sum',
    SHARED_PROBLEM_URL,
    { difficulty: 'Easy' },
  );
  const topicsPublicSeeds = [
    ['Coin Change', 'https://leetcode.com/problems/coin-change/'],
    ['Longest Increasing Subsequence', 'https://leetcode.com/problems/longest-increasing-subsequence/'],
    ['Word Break', 'https://leetcode.com/problems/word-break/'],
    ['Partition Equal Subset Sum', 'https://leetcode.com/problems/partition-equal-subset-sum/'],
  ] as const;
  for (const [title, url] of topicsPublicSeeds) {
    await ensureProblem(userIds['demo-topics']!, topicsPublic, title, url, {
      difficulty: 'Medium',
    });
  }
  await ensureProblem(
    userIds['demo-topics']!,
    topicsPrivate,
    'Hidden String Task',
    'https://leetcode.com/problems/reverse-string/',
    { difficulty: 'Easy' },
  );

  const trapPublic = await ensureTopic(
    userIds['demo-trap']!,
    'Trap Public',
    true,
    'Must never surface while owner is private.',
  );
  await ensureProblem(
    userIds['demo-trap']!,
    trapPublic,
    'Trap Problem',
    'https://leetcode.com/problems/trapping-rain-water/',
    { difficulty: 'Hard' },
  );

  const viewerDp = await ensureTopic(viewerId, 'Arrays', false);
  await ensureProblem(viewerId, viewerDp, 'Two Sum (viewer)', SHARED_PROBLEM_URL);

  console.log(
    `Discover demo seed complete (demo-viewer + ${matrix.length} matrix users; public topic ${topicsPublic}).`,
  );
} finally {
  await pool.end();
}