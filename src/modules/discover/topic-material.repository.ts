import { Injectable } from '@nestjs/common';
import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import type { PracticeGoal } from '../../database/schema/users/practice-goal.enum.js';
import {
  problemTopics,
  problems,
  topics,
  users,
} from '../../database/schema/index.js';
import {
  MIN_OWNERS_COMMONLY_TRACKED,
  PUBLIC_LIST_MIN_PROBLEMS,
  SPECIALIST_MIN_COMPLETION,
  SPECIALIST_MIN_PROBLEMS,
} from './discover.config.js';
import type { PublicListRankRow } from './topic-material.js';
import { eligiblePublicTopicConditions } from './visibility.js';

export type TopicSizeRow = {
  topicId: string;
  userId: string;
  total: number;
  solved: number;
};

@Injectable()
export class TopicMaterialRepository {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  private topicTotalSql() {
    return sql<number>`(
      select count(*)::int from ${problemTopics} pt
      inner join ${problems} p on p.id = pt.problem_id
      where pt.topic_id = ${topics.id}
    )`;
  }

  private topicSolvedSql() {
    return sql<number>`(
      select count(*)::int from ${problemTopics} pt
      inner join ${problems} p on p.id = pt.problem_id
      where pt.topic_id = ${topics.id} and p.status = 'solved'
    )`;
  }

  private eligibleTopicsWhere(normalizedName?: string) {
    const conditions = [
      eligiblePublicTopicConditions(),
      sql`${this.topicTotalSql()} >= ${PUBLIC_LIST_MIN_PROBLEMS}`,
    ];
    if (normalizedName) {
      conditions.push(eq(topics.normalizedName, normalizedName));
    }
    return conditions;
  }

  async loadPublicListRankRows(normalizedName: string): Promise<PublicListRankRow[]> {
    const conditions = this.eligibleTopicsWhere(normalizedName);
    const totalSql = this.topicTotalSql();
    const solvedSql = this.topicSolvedSql();
    const rows = await this.db
      .select({
        topicId: topics.id,
        ownerUserId: topics.userId,
        handle: users.handle,
        name: topics.name,
        description: topics.description,
        total: totalSql,
        solved: solvedSql,
      })
      .from(topics)
      .innerJoin(users, eq(users.id, topics.userId))
      .where(and(...conditions));
    return rows.map((r) => ({
      topicId: r.topicId,
      ownerUserId: r.ownerUserId,
      handle: r.handle,
      name: r.name,
      description: r.description,
      total: Number(r.total),
      solved: Number(r.solved),
      copies30d: 0,
    }));
  }

  async countPracticers(normalizedName: string): Promise<number> {
    const conditions = this.eligibleTopicsWhere(normalizedName);
    const [row] = await this.db
      .select({
        count: sql<number>`count(distinct ${topics.userId})::int`,
      })
      .from(topics)
      .where(and(...conditions));
    return Number(row?.count ?? 0);
  }

  async countPublicLists(normalizedName: string): Promise<number> {
    const conditions = this.eligibleTopicsWhere(normalizedName);
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(topics)
      .where(and(...conditions));
    return Number(row?.count ?? 0);
  }

  async loadDirectoryYour(viewerId: string) {
    const viewerTopics = await this.db
      .select({
        name: topics.name,
        normalizedName: topics.normalizedName,
      })
      .from(topics)
      .where(eq(topics.userId, viewerId))
      .orderBy(topics.normalizedName);

    const result = [];
    for (const row of viewerTopics) {
      const [practicers, listCount] = await Promise.all([
        this.countPracticers(row.normalizedName),
        this.countPublicLists(row.normalizedName),
      ]);
      result.push({
        name: row.name,
        normalizedName: row.normalizedName,
        practicerCount: practicers,
        publicListCount: listCount,
      });
    }
    return result;
  }

  async loadDirectoryPopular() {
    const rows = await this.db
      .select({
        normalizedName: topics.normalizedName,
        name: sql<string>`min(${topics.name})`,
        practicers: sql<number>`count(distinct ${topics.userId})::int`,
        listCount: sql<number>`count(*)::int`,
      })
      .from(topics)
      .where(
        and(
          eligiblePublicTopicConditions(),
          sql`${this.topicTotalSql()} >= ${PUBLIC_LIST_MIN_PROBLEMS}`,
        ),
      )
      .groupBy(topics.normalizedName);

    return rows
      .filter((r) => Number(r.practicers) >= 3 || Number(r.listCount) >= 3)
      .map((r) => ({
        name: r.name,
        normalizedName: r.normalizedName,
        practicerCount: Number(r.practicers),
        publicListCount: Number(r.listCount),
      }))
      .sort(
        (a, b) =>
          b.publicListCount - a.publicListCount ||
          a.normalizedName.localeCompare(b.normalizedName),
      );
  }

  async findViewerTopic(viewerId: string, normalizedName: string) {
    const [row] = await this.db
      .select({
        id: topics.id,
        name: topics.name,
        isPublic: topics.isPublic,
      })
      .from(topics)
      .where(and(eq(topics.userId, viewerId), eq(topics.normalizedName, normalizedName)))
      .limit(1);
    return row;
  }

  async loadSpecialistCandidates(normalizedName: string) {
    const totalSql = this.topicTotalSql();
    const solvedSql = this.topicSolvedSql();
    const rows = await this.db
      .select({
        userId: topics.userId,
        handle: users.handle,
        name: users.name,
        avatarMediaId: users.avatarMediaId,
        total: totalSql,
        solved: solvedSql,
      })
      .from(topics)
      .innerJoin(users, eq(users.id, topics.userId))
      .where(
        and(
          eq(topics.normalizedName, normalizedName),
          eligiblePublicTopicConditions(),
          sql`${totalSql} >= ${SPECIALIST_MIN_PROBLEMS}`,
        ),
      );
    return rows
      .map((r) => {
        const total = Number(r.total);
        const solved = Number(r.solved);
        const completion = total > 0 ? solved / total : 0;
        const score = completion * Math.log(Math.max(total, 1));
        return { ...r, total, solved, completion, score };
      })
      .filter((r) => r.completion >= SPECIALIST_MIN_COMPLETION)
      .sort(
        (a, b) =>
          b.score - a.score || a.handle.localeCompare(b.handle),
      );
  }

  async countTopicPatternCohort(normalizedName: string): Promise<number> {
    const [row] = await this.db
      .select({
        count: sql<number>`count(distinct ${topics.userId})::int`,
      })
      .from(topics)
      .innerJoin(users, eq(users.id, topics.userId))
      .where(
        and(
          eq(topics.normalizedName, normalizedName),
          eq(users.practiceVisibility, 'topics'),
        ),
      );
    return Number(row?.count ?? 0);
  }

  async loadTopicCoOccurrence(
    normalizedName: string,
  ): Promise<{ normalizedName: string; name: string; count: number }[]> {
    const cohortUserIds = await this.db
      .select({ userId: topics.userId })
      .from(topics)
      .innerJoin(users, eq(users.id, topics.userId))
      .where(
        and(
          eq(topics.normalizedName, normalizedName),
          eq(users.practiceVisibility, 'topics'),
        ),
      );
    const ids = [...new Set(cohortUserIds.map((r) => r.userId))];
    if (ids.length === 0) return [];

    const rows = await this.db
      .select({
        normalizedName: topics.normalizedName,
        name: sql<string>`min(${topics.name})`,
        userCount: sql<number>`count(distinct ${topics.userId})::int`,
      })
      .from(topics)
      .where(
        and(inArray(topics.userId, ids), ne(topics.normalizedName, normalizedName)),
      )
      .groupBy(topics.normalizedName);

    return rows.map((r) => ({
      normalizedName: r.normalizedName,
      name: r.name,
      count: Number(r.userCount),
    }));
  }

  async loadGoalCohortTopicCounts(
    goal: PracticeGoal,
  ): Promise<{ normalizedName: string; name: string; count: number }[]> {
    const cohort = await this.db
      .select({ id: users.id })
      .from(users)
      .where(
        and(eq(users.practiceGoal, goal), eq(users.practiceVisibility, 'topics')),
      );
    const ids = cohort.map((r) => r.id);
    if (ids.length === 0) return [];

    const rows = await this.db
      .select({
        normalizedName: topics.normalizedName,
        name: sql<string>`min(${topics.name})`,
        userCount: sql<number>`count(distinct ${topics.userId})::int`,
      })
      .from(topics)
      .where(inArray(topics.userId, ids))
      .groupBy(topics.normalizedName);

    return rows.map((r) => ({
      normalizedName: r.normalizedName,
      name: r.name,
      count: Number(r.userCount),
    }));
  }

  async countGoalCohort(goal: PracticeGoal): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(
        and(eq(users.practiceGoal, goal), eq(users.practiceVisibility, 'topics')),
      );
    return Number(row?.count ?? 0);
  }

  async loadCommonlyTracked(
    normalizedName: string,
    viewerId: string,
    excludeMine: boolean,
  ) {
    const totalSql = this.topicTotalSql();
    const rows = await this.db
      .select({
        normalizedUrl: problems.normalizedUrl,
        title: sql<string>`min(${problems.title})`,
        platformSlug: sql<string>`min(${problems.platformSlug})`,
        difficulty: sql<string | null>`min(${problems.difficulty})`,
        ownerCount: sql<number>`count(distinct ${topics.userId})::int`,
      })
      .from(topics)
      .innerJoin(problemTopics, eq(problemTopics.topicId, topics.id))
      .innerJoin(problems, eq(problemTopics.problemId, problems.id))
      .where(
        and(
          eq(topics.normalizedName, normalizedName),
          eligiblePublicTopicConditions(),
          sql`${totalSql} >= ${PUBLIC_LIST_MIN_PROBLEMS}`,
        ),
      )
      .groupBy(problems.normalizedUrl)
      .having(sql`count(distinct ${topics.userId}) >= ${MIN_OWNERS_COMMONLY_TRACKED}`);

    let filtered = rows;
    if (excludeMine && rows.length > 0) {
      const owned = await this.db
        .select({ normalizedUrl: problems.normalizedUrl })
        .from(problems)
        .where(eq(problems.userId, viewerId));
      const ownedSet = new Set(owned.map((r) => r.normalizedUrl));
      filtered = rows.filter((r) => !ownedSet.has(r.normalizedUrl));
    }

    return filtered
      .map((r) => ({
        normalizedUrl: r.normalizedUrl,
        title: r.title,
        platformSlug: r.platformSlug,
        difficulty: r.difficulty,
        listCount: Number(r.ownerCount),
      }))
      .sort(
        (a, b) =>
          b.listCount - a.listCount ||
          (a.difficulty ?? '').localeCompare(b.difficulty ?? '') ||
          a.normalizedUrl.localeCompare(b.normalizedUrl),
      );
  }

  async loadTopicHints(viewerId: string) {
    const viewerTopics = await this.db
      .select({
        topicId: topics.id,
        name: topics.name,
        normalizedName: topics.normalizedName,
      })
      .from(topics)
      .where(eq(topics.userId, viewerId));
    const hints = [];
    for (const row of viewerTopics) {
      const [practicers, listCount] = await Promise.all([
        this.countPracticers(row.normalizedName),
        this.countPublicLists(row.normalizedName),
      ]);
      hints.push({
        topicId: row.topicId,
        topicName: row.name,
        normalizedName: row.normalizedName,
        practicerCount: practicers,
        publicListCount: listCount,
      });
    }
    return hints;
  }

  async findViewerOwnedProblem(viewerId: string, problemId: string) {
    const [row] = await this.db
      .select({
        normalizedUrl: problems.normalizedUrl,
        title: problems.title,
        platformSlug: problems.platformSlug,
      })
      .from(problems)
      .where(and(eq(problems.id, problemId), eq(problems.userId, viewerId)))
      .limit(1);
    return row;
  }

  async countCommunityLists(normalizedUrl: string): Promise<number> {
    const totalSql = this.topicTotalSql();
    const [row] = await this.db
      .select({
        count: sql<number>`count(distinct ${topics.id})::int`,
      })
      .from(topics)
      .innerJoin(problemTopics, eq(problemTopics.topicId, topics.id))
      .innerJoin(problems, eq(problemTopics.problemId, problems.id))
      .where(
        and(
          eq(problems.normalizedUrl, normalizedUrl),
          eligiblePublicTopicConditions(),
          sql`${totalSql} >= ${PUBLIC_LIST_MIN_PROBLEMS}`,
        ),
      );
    return Number(row?.count ?? 0);
  }

  async loadMoreListsPreview(normalizedName: string, excludeOwnerId: string, limit: number) {
    const conditions = this.eligibleTopicsWhere(normalizedName);
    const totalSql = this.topicTotalSql();
    const solvedSql = this.topicSolvedSql();
    return this.db
      .select({
        topicId: topics.id,
        handle: users.handle,
        name: topics.name,
        total: totalSql,
        solved: solvedSql,
      })
      .from(topics)
      .innerJoin(users, eq(users.id, topics.userId))
      .where(and(...conditions, ne(topics.userId, excludeOwnerId)))
      .orderBy(sql`${totalSql} desc`, users.handle)
      .limit(limit);
  }
}