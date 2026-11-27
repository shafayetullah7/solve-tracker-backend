import { Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  ilike,
  inArray,
  isNull,
  notExists,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { escapeIlikePattern } from '../../common/ilike-escape.js';
import { DatabaseService } from '../../database/database.service.js';
import {
  learningBlocks,
  learningGuides,
  learningNodes,
  learningProblemLinks,
  problemTopics,
  problems,
  topics,
  type Problem,
} from '../../database/schema/index.js';

export type ProblemTopicSummary = { id: string; name: string };

export type ProblemDetail = {
  problem: Problem;
  topics: ProblemTopicSummary[];
};

export type ProblemLearningReferenceRow = {
  guideId: string;
  guideTitle: string;
  nodeId: string;
  nodeTitle: string;
};

export type ListProblemsFilters = {
  userId: string;
  page: number;
  pageSize: number;
  q?: string;
  status?: 'solved' | 'unsolved';
  platformSlug?: string;
  topicIds?: string[];
  untagged?: boolean;
  sort: 'title' | 'createdAt' | 'solvedAt';
  order: 'asc' | 'desc';
};

export type ProblemInsertRow = {
  title: string;
  url: string;
  normalizedUrl: string;
  platformSlug: string;
  platformProblemId: string | null;
  difficulty: string | null;
  rating: number | null;
  notes: string | null;
  status: 'solved' | 'unsolved';
  solvedAt: Date | null;
};

export type ProblemPatchRow = Partial<
  Omit<ProblemInsertRow, 'status' | 'solvedAt'>
> & {
  status?: 'solved' | 'unsolved';
  solvedAt?: Date | null;
};

@Injectable()
export class ProblemsRepository {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  async topicOwnedByUser(
    userId: string,
    topicId: string,
  ): Promise<boolean> {
    const rows = await this.db
      .select({ id: topics.id })
      .from(topics)
      .where(and(eq(topics.id, topicId), eq(topics.userId, userId)))
      .limit(1);
    return rows.length > 0;
  }

  async countOwnedTopics(
    userId: string,
    topicIds: string[],
  ): Promise<number> {
    if (topicIds.length === 0) return 0;
    const [row] = await this.db
      .select({ total: count() })
      .from(topics)
      .where(and(eq(topics.userId, userId), inArray(topics.id, topicIds)));
    return Number(row?.total ?? 0);
  }

  private buildListWhere(filters: ListProblemsFilters): SQL | undefined {
    const conditions: SQL[] = [eq(problems.userId, filters.userId)];

    if (filters.q) {
      const pattern = escapeIlikePattern(filters.q);
      const searchParts: SQL[] = [ilike(problems.title, pattern)];
      searchParts.push(
        sql`coalesce(${problems.platformProblemId}, '') ilike ${pattern}`,
      );
      const combined = or(...searchParts);
      if (combined) conditions.push(combined);
    }

    if (filters.status) {
      conditions.push(eq(problems.status, filters.status));
    }

    if (filters.platformSlug) {
      conditions.push(eq(problems.platformSlug, filters.platformSlug));
    }

    if (filters.untagged) {
      conditions.push(
        notExists(
          this.db
            .select({ one: sql`1` })
            .from(problemTopics)
            .where(eq(problemTopics.problemId, problems.id)),
        ),
      );
    }

    if (filters.topicIds && filters.topicIds.length > 0) {
      conditions.push(
        exists(
          this.db
            .select({ one: sql`1` })
            .from(problemTopics)
            .where(
              and(
                eq(problemTopics.problemId, problems.id),
                inArray(problemTopics.topicId, filters.topicIds),
              ),
            ),
        ),
      );
    }

    return and(...conditions);
  }

  private listOrderBy(filters: ListProblemsFilters) {
    const tieBreak = asc(problems.id);
    if (filters.sort === 'title') {
      const primary =
        filters.order === 'asc' ? asc(problems.title) : desc(problems.title);
      return [primary, tieBreak];
    }
    if (filters.sort === 'solvedAt') {
      const primary =
        filters.order === 'asc'
          ? sql`${problems.solvedAt} asc nulls last`
          : sql`${problems.solvedAt} desc nulls last`;
      return [primary, tieBreak];
    }
    const primary =
      filters.order === 'asc'
        ? asc(problems.createdAt)
        : desc(problems.createdAt);
    return [primary, tieBreak];
  }

  private async loadTopicSummaries(
    problemIds: string[],
  ): Promise<Map<string, ProblemTopicSummary[]>> {
    const map = new Map<string, ProblemTopicSummary[]>();
    if (problemIds.length === 0) return map;
    const rows = await this.db
      .select({
        problemId: problemTopics.problemId,
        id: topics.id,
        name: topics.name,
      })
      .from(problemTopics)
      .innerJoin(topics, eq(problemTopics.topicId, topics.id))
      .where(inArray(problemTopics.problemId, problemIds))
      .orderBy(asc(topics.name), asc(topics.id));
    for (const row of rows) {
      const list = map.get(row.problemId) ?? [];
      list.push({ id: row.id, name: row.name });
      map.set(row.problemId, list);
    }
    return map;
  }

  async list(
    filters: ListProblemsFilters,
  ): Promise<{ items: ProblemDetail[]; total: number }> {
    const offset = (filters.page - 1) * filters.pageSize;
    const whereClause = this.buildListWhere(filters);

    const [totalRow] = await this.db
      .select({ total: count() })
      .from(problems)
      .where(whereClause);
    const total = Number(totalRow?.total ?? 0);

    const problemRows = await this.db
      .select()
      .from(problems)
      .where(whereClause)
      .orderBy(...this.listOrderBy(filters))
      .limit(filters.pageSize)
      .offset(offset);

    const summaries = await this.loadTopicSummaries(
      problemRows.map((row) => row.id),
    );
    const items = problemRows.map((problem) => ({
      problem,
      topics: summaries.get(problem.id) ?? [],
    }));
    return { items, total };
  }

  async findDetailed(
    userId: string,
    problemId: string,
  ): Promise<ProblemDetail | undefined> {
    const rows = await this.db
      .select()
      .from(problems)
      .where(and(eq(problems.id, problemId), eq(problems.userId, userId)))
      .limit(1);
    const problem = rows[0];
    if (!problem) return undefined;
    const summaries = await this.loadTopicSummaries([problem.id]);
    return { problem, topics: summaries.get(problem.id) ?? [] };
  }

  async findIdByNormalizedUrl(
    userId: string,
    normalizedUrl: string,
  ): Promise<string | undefined> {
    const rows = await this.db
      .select({ id: problems.id })
      .from(problems)
      .where(
        and(
          eq(problems.userId, userId),
          eq(problems.normalizedUrl, normalizedUrl),
        ),
      )
      .limit(1);
    return rows[0]?.id;
  }

  async listLearningReferencesForNormalizedUrl(
    ownerId: string,
    normalizedUrl: string,
  ): Promise<ProblemLearningReferenceRow[]> {
    const rows = await this.db
      .select({
        guideId: learningGuides.id,
        guideTitle: learningGuides.title,
        nodeId: learningNodes.id,
        nodeTitle: learningNodes.title,
      })
      .from(learningProblemLinks)
      .innerJoin(
        learningBlocks,
        and(
          eq(learningBlocks.guideId, learningProblemLinks.guideId),
          eq(learningBlocks.id, learningProblemLinks.blockId),
        ),
      )
      .innerJoin(
        learningNodes,
        and(
          eq(learningNodes.guideId, learningBlocks.guideId),
          eq(learningNodes.id, learningBlocks.nodeId),
        ),
      )
      .innerJoin(learningGuides, eq(learningGuides.id, learningProblemLinks.guideId))
      .where(
        and(
          eq(learningProblemLinks.normalizedUrl, normalizedUrl),
          eq(learningGuides.ownerId, ownerId),
          isNull(learningGuides.deletedAt),
          isNull(learningNodes.deletedAt),
        ),
      )
      .orderBy(asc(learningGuides.title), asc(learningNodes.title), asc(learningNodes.id));
    const deduped = new Map<string, ProblemLearningReferenceRow>();
    for (const row of rows) {
      const key = `${row.guideId}:${row.nodeId}`;
      if (!deduped.has(key)) deduped.set(key, row);
    }
    return [...deduped.values()];
  }

  async findStatusesByNormalizedUrls(
    userId: string,
    normalizedUrls: readonly string[],
  ): Promise<Map<string, { problemId: string; status: 'solved' | 'unsolved' }>> {
    const unique = [...new Set(normalizedUrls.filter((url) => url.length > 0))];
    if (unique.length === 0) return new Map();
    const rows = await this.db
      .select({
        id: problems.id,
        normalizedUrl: problems.normalizedUrl,
        status: problems.status,
      })
      .from(problems)
      .where(and(eq(problems.userId, userId), inArray(problems.normalizedUrl, unique)));
    const result = new Map<string, { problemId: string; status: 'solved' | 'unsolved' }>();
    for (const row of rows) {
      result.set(row.normalizedUrl, {
        problemId: row.id,
        status: row.status,
      });
    }
    return result;
  }

  async createWithTopics(
    userId: string,
    row: ProblemInsertRow,
    topicIds: string[],
  ): Promise<ProblemDetail> {
    return this.db.transaction(async (tx) => {
      const now = new Date();
      const problem = (
        await tx
          .insert(problems)
          .values({
            userId,
            ...row,
            createdAt: now,
            updatedAt: now,
          })
          .returning()
      )[0]!;
      if (topicIds.length > 0)
        await tx
          .insert(problemTopics)
          .values(topicIds.map((topicId) => ({ problemId: problem.id, topicId })));
      const summaries =
        topicIds.length === 0
          ? []
          : await tx
              .select({ id: topics.id, name: topics.name })
              .from(topics)
              .where(inArray(topics.id, topicIds))
              .orderBy(asc(topics.name), asc(topics.id));
      return { problem, topics: summaries };
    });
  }

  async updateWithTopics(
    userId: string,
    problemId: string,
    patch: ProblemPatchRow,
    topicIds?: string[],
  ): Promise<ProblemDetail | undefined> {
    return this.db.transaction(async (tx) => {
      const set: Record<string, unknown> = { updatedAt: new Date() };
      for (const key of [
        'title',
        'url',
        'normalizedUrl',
        'platformSlug',
        'platformProblemId',
        'difficulty',
        'rating',
        'notes',
        'status',
        'solvedAt',
      ] as const) {
        if (key in patch) set[key] = patch[key];
      }
      const updated = await tx
        .update(problems)
        .set(set)
        .where(and(eq(problems.id, problemId), eq(problems.userId, userId)))
        .returning();
      const problem = updated[0];
      if (!problem) return undefined;

      if (topicIds !== undefined) {
        await tx
          .delete(problemTopics)
          .where(eq(problemTopics.problemId, problemId));
        if (topicIds.length > 0)
          await tx
            .insert(problemTopics)
            .values(
              topicIds.map((topicId) => ({ problemId: problem.id, topicId })),
            );
      }

      const joinRows = await tx
        .select({ topicId: problemTopics.topicId })
        .from(problemTopics)
        .where(eq(problemTopics.problemId, problem.id));
      const ids = joinRows.map((r) => r.topicId);
      const summaries =
        ids.length === 0
          ? []
          : await tx
              .select({ id: topics.id, name: topics.name })
              .from(topics)
              .where(inArray(topics.id, ids))
              .orderBy(asc(topics.name), asc(topics.id));

      return { problem, topics: summaries };
    });
  }

  async delete(userId: string, problemId: string): Promise<boolean> {
    const rows = await this.db
      .delete(problems)
      .where(and(eq(problems.id, problemId), eq(problems.userId, userId)))
      .returning({ id: problems.id });
    return rows.length > 0;
  }
}