import { Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  sql,
  type SQL,
} from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import {
  problemTopics,
  problems,
  topics,
} from '../../database/schema/index.js';
import { publicTopicCondition } from './visibility.js';

export type PublicTopicRow = {
  id: string;
  name: string;
  normalizedName: string;
  description: string;
  isPublic: boolean;
  total: number;
  solved: number;
};

export type PublicTopicProblemRow = {
  title: string;
  url: string;
  platformSlug: string;
  platformProblemId: string | null;
  difficulty: string | null;
  rating: number | null;
  status: 'solved' | 'unsolved';
  normalizedUrl: string;
};

export type ListPublicProblemsFilters = {
  subjectUserId: string;
  topicId: string;
  page: number;
  pageSize: number;
  status?: 'solved' | 'unsolved';
  platformSlug?: string;
};

@Injectable()
export class PeopleRepository {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  async loadTopicBoard(subjectUserId: string): Promise<PublicTopicRow[]> {
    const rows = await this.db
      .select({
        id: topics.id,
        name: topics.name,
        normalizedName: topics.normalizedName,
        description: topics.description,
        isPublic: topics.isPublic,
        total: count(problems.id),
        solved: count(
          sql`case when ${problems.status} = 'solved' then 1 end`,
        ),
      })
      .from(topics)
      .leftJoin(
        problemTopics,
        eq(problemTopics.topicId, topics.id),
      )
      .leftJoin(
        problems,
        and(
          eq(problemTopics.problemId, problems.id),
          eq(problems.userId, subjectUserId),
        ),
      )
      .where(eq(topics.userId, subjectUserId))
      .groupBy(topics.id)
      .orderBy(asc(topics.name), asc(topics.id));

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      normalizedName: row.normalizedName,
      description: row.description,
      isPublic: row.isPublic,
      total: Number(row.total ?? 0),
      solved: Number(row.solved ?? 0),
    }));
  }

  async findPublicTopic(
    subjectUserId: string,
    topicId: string,
  ): Promise<PublicTopicRow | undefined> {
    const rows = await this.db
      .select({
        id: topics.id,
        name: topics.name,
        normalizedName: topics.normalizedName,
        description: topics.description,
        isPublic: topics.isPublic,
        total: count(problems.id),
        solved: count(
          sql`case when ${problems.status} = 'solved' then 1 end`,
        ),
      })
      .from(topics)
      .leftJoin(problemTopics, eq(problemTopics.topicId, topics.id))
      .leftJoin(
        problems,
        and(
          eq(problemTopics.problemId, problems.id),
          eq(problems.userId, subjectUserId),
        ),
      )
      .where(publicTopicCondition(subjectUserId, topicId))
      .groupBy(topics.id)
      .limit(1);

    const row = rows[0];
    if (!row) return undefined;
    return {
      id: row.id,
      name: row.name,
      normalizedName: row.normalizedName,
      description: row.description,
      isPublic: row.isPublic,
      total: Number(row.total ?? 0),
      solved: Number(row.solved ?? 0),
    };
  }

  async loadTopicProblemHistogram(
    subjectUserId: string,
    topicId: string,
  ): Promise<Array<{ difficulty: string | null; rating: number | null }>> {
    return this.db
      .select({
        difficulty: problems.difficulty,
        rating: problems.rating,
      })
      .from(problems)
      .innerJoin(problemTopics, eq(problemTopics.problemId, problems.id))
      .innerJoin(topics, eq(problemTopics.topicId, topics.id))
      .where(
        and(
          eq(problems.userId, subjectUserId),
          eq(problemTopics.topicId, topicId),
          eq(topics.isPublic, true),
        ),
      );
  }

  private listProblemsWhere(filters: ListPublicProblemsFilters): SQL {
    const parts: SQL[] = [
      eq(problems.userId, filters.subjectUserId),
      eq(problemTopics.topicId, filters.topicId),
      eq(topics.isPublic, true),
      eq(topics.userId, filters.subjectUserId),
    ];
    if (filters.status) parts.push(eq(problems.status, filters.status));
    if (filters.platformSlug) {
      parts.push(eq(problems.platformSlug, filters.platformSlug));
    }
    return and(...parts)!;
  }

  async listPublicTopicProblems(
    filters: ListPublicProblemsFilters,
  ): Promise<{ items: PublicTopicProblemRow[]; total: number }> {
    const where = this.listProblemsWhere(filters);
    const offset = (filters.page - 1) * filters.pageSize;

    const [totalRow] = await this.db
      .select({ total: count() })
      .from(problems)
      .innerJoin(problemTopics, eq(problemTopics.problemId, problems.id))
      .innerJoin(topics, eq(problemTopics.topicId, topics.id))
      .where(where);
    const total = Number(totalRow?.total ?? 0);

    const items = await this.db
      .select({
        title: problems.title,
        url: problems.url,
        platformSlug: problems.platformSlug,
        platformProblemId: problems.platformProblemId,
        difficulty: problems.difficulty,
        rating: problems.rating,
        status: problems.status,
        normalizedUrl: problems.normalizedUrl,
      })
      .from(problems)
      .innerJoin(problemTopics, eq(problemTopics.problemId, problems.id))
      .innerJoin(topics, eq(problemTopics.topicId, topics.id))
      .where(where)
      .orderBy(asc(problems.title), asc(problems.id))
      .limit(filters.pageSize)
      .offset(offset);

    return {
      items: items.map((row) => ({
        ...row,
        status: row.status as 'solved' | 'unsolved',
      })),
      total,
    };
  }

  async viewerNormalizedUrls(
    viewerUserId: string,
    urls: string[],
  ): Promise<Set<string>> {
    if (urls.length === 0) return new Set();
    const rows = await this.db
      .select({ normalizedUrl: problems.normalizedUrl })
      .from(problems)
      .where(
        and(
          eq(problems.userId, viewerUserId),
          inArray(problems.normalizedUrl, urls),
        ),
      );
    return new Set(rows.map((r) => r.normalizedUrl));
  }
}