import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, gte, isNotNull, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import {
  problemTopics,
  problems,
  topics,
} from '../../database/schema/index.js';

export type RawOverallCounts = { total: number; solved: number };

export type RawTopicCounts = {
  topicId: string;
  total: number;
  solved: number;
};

export type OwnedTopicRow = { id: string; name: string };

export type RawPlatformSlugCounts = {
  platformSlug: string;
  total: number;
  solved: number;
};

export type RawWeeklyCount = {
  weekStart: string;
  count: number;
};

@Injectable()
export class ProgressRepository {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  async loadOverallCounts(userId: string): Promise<RawOverallCounts> {
    const [row] = await this.db
      .select({
        total: count(),
        solved: count(
          sql`case when ${problems.status} = 'solved' then 1 end`,
        ),
      })
      .from(problems)
      .where(eq(problems.userId, userId));
    return {
      total: Number(row?.total ?? 0),
      solved: Number(row?.solved ?? 0),
    };
  }

  async loadOwnedTopics(userId: string): Promise<OwnedTopicRow[]> {
    return this.db
      .select({ id: topics.id, name: topics.name })
      .from(topics)
      .where(eq(topics.userId, userId))
      .orderBy(asc(topics.name), asc(topics.id));
  }

  async loadTopicAssociationCounts(userId: string): Promise<RawTopicCounts[]> {
    const rows = await this.db
      .select({
        topicId: problemTopics.topicId,
        total: count(),
        solved: count(
          sql`case when ${problems.status} = 'solved' then 1 end`,
        ),
      })
      .from(problemTopics)
      .innerJoin(
        problems,
        and(
          eq(problemTopics.problemId, problems.id),
          eq(problems.userId, userId),
        ),
      )
      .groupBy(problemTopics.topicId);
    return rows.map((r) => ({
      topicId: r.topicId,
      total: Number(r.total),
      solved: Number(r.solved),
    }));
  }

  async loadPlatformSlugCounts(
    userId: string,
  ): Promise<RawPlatformSlugCounts[]> {
    const rows = await this.db
      .select({
        platformSlug: problems.platformSlug,
        total: count(),
        solved: count(
          sql`case when ${problems.status} = 'solved' then 1 end`,
        ),
      })
      .from(problems)
      .where(eq(problems.userId, userId))
      .groupBy(problems.platformSlug);
    return rows.map((r) => ({
      platformSlug: r.platformSlug,
      total: Number(r.total),
      solved: Number(r.solved),
    }));
  }

  async loadWeeklyAddedCounts(
    userId: string,
    since: Date,
  ): Promise<RawWeeklyCount[]> {
    const weekStart = sql<string>`(date_trunc('week', ${problems.createdAt})::date)::text`;
    const rows = await this.db
      .select({ weekStart, count: count() })
      .from(problems)
      .where(and(eq(problems.userId, userId), gte(problems.createdAt, since)))
      .groupBy(weekStart);
    return rows.map((r) => ({
      weekStart: r.weekStart,
      count: Number(r.count),
    }));
  }

  async loadWeeklySolvedCounts(
    userId: string,
    since: Date,
  ): Promise<RawWeeklyCount[]> {
    const weekStart = sql<string>`(date_trunc('week', ${problems.solvedAt})::date)::text`;
    const rows = await this.db
      .select({ weekStart, count: count() })
      .from(problems)
      .where(
        and(
          eq(problems.userId, userId),
          isNotNull(problems.solvedAt),
          gte(problems.solvedAt, since),
        ),
      )
      .groupBy(weekStart);
    return rows.map((r) => ({
      weekStart: r.weekStart,
      count: Number(r.count),
    }));
  }

  async loadDistinctSolveDates(userId: string): Promise<string[]> {
    const solveDay = sql<string>`(${problems.solvedAt}::date)::text`;
    const rows = await this.db
      .select({ solveDay })
      .from(problems)
      .where(and(eq(problems.userId, userId), isNotNull(problems.solvedAt)))
      .groupBy(solveDay);
    return rows.map((r) => r.solveDay);
  }
}