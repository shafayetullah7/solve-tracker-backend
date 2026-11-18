import { and, eq } from 'drizzle-orm';
import type { DatabaseService } from '../database.service.js';
import * as schema from '../schema/index.js';
import { STARTER_LISTS } from './starter-lists.data.js';
import { prepareProblemUrl } from '../../modules/problems/problem-url.js';
import { storedPlatformSlugFromUrl } from '../../modules/problems/problem-platform-slug.js';
import { prepareTopicName } from '../../modules/topics/topic-name.js';

const STARTER_EMAIL = 'starter@practice.invalid';
const STARTER_HANDLE = 'starter';
const STARTER_NAME = 'Practice starter lists';

export async function seedStarterLists(
  db: DatabaseService['db'],
): Promise<{ userId: string }> {
  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, STARTER_EMAIL))
    .limit(1);

  let userId = existing[0]?.id;
  if (!userId) {
    const [row] = await db
      .insert(schema.users)
      .values({
        name: STARTER_NAME,
        email: STARTER_EMAIL,
        handle: STARTER_HANDLE,
        passwordHash: null,
        practiceVisibility: 'topics',
        practiceGoal: null,
      })
      .returning({ id: schema.users.id });
    userId = row!.id;
  } else {
    await db
      .update(schema.users)
      .set({
        name: STARTER_NAME,
        handle: STARTER_HANDLE,
        practiceVisibility: 'topics',
        passwordHash: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId));
  }

  for (const topic of STARTER_LISTS) {
    const { name, normalizedName } = prepareTopicName(topic.name);
    const topicExisting = await db
      .select({ id: schema.topics.id })
      .from(schema.topics)
      .where(
        and(
          eq(schema.topics.userId, userId),
          eq(schema.topics.normalizedName, normalizedName),
        ),
      )
      .limit(1);

    let topicId = topicExisting[0]?.id;
    if (!topicId) {
      const [row] = await db
        .insert(schema.topics)
        .values({
          userId,
          name,
          normalizedName,
          isPublic: true,
          description: topic.description,
        })
        .returning({ id: schema.topics.id });
      topicId = row!.id;
    } else {
      await db
        .update(schema.topics)
        .set({
          name,
          isPublic: true,
          description: topic.description,
          updatedAt: new Date(),
        })
        .where(eq(schema.topics.id, topicId));
    }

    for (const problem of topic.problems) {
      const prepared = prepareProblemUrl(problem.url);
      const problemExisting = await db
        .select({ id: schema.problems.id })
        .from(schema.problems)
        .where(
          and(
            eq(schema.problems.userId, userId),
            eq(schema.problems.normalizedUrl, prepared.normalizedUrl),
          ),
        )
        .limit(1);

      let problemId = problemExisting[0]?.id;
      if (!problemId) {
        const [row] = await db
          .insert(schema.problems)
          .values({
            userId,
            title: problem.title,
            url: prepared.url,
            normalizedUrl: prepared.normalizedUrl,
            platformSlug: storedPlatformSlugFromUrl(prepared.url),
            platformProblemId: problem.platformProblemId ?? null,
            difficulty: problem.difficulty ?? null,
            rating: problem.rating ?? null,
            status: 'unsolved',
          })
          .returning({ id: schema.problems.id });
        problemId = row!.id;
      }

      const link = await db
        .select()
        .from(schema.problemTopics)
        .where(
          and(
            eq(schema.problemTopics.problemId, problemId),
            eq(schema.problemTopics.topicId, topicId),
          ),
        )
        .limit(1);
      if (!link[0]) {
        await db
          .insert(schema.problemTopics)
          .values({ problemId, topicId });
      }
    }
  }

  return { userId };
}