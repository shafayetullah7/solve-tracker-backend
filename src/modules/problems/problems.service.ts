import { Injectable } from '@nestjs/common';
import { applyCompletionTransition } from './problem-completion.js';
import { prepareProblemTitle, ProblemTitleError } from './problem-title.js';
import { prepareProblemUrl, ProblemUrlError } from './problem-url.js';
import { problemError } from './problems.errors.js';
import {
  ProblemsRepository,
  type ProblemDetail,
  type ProblemInsertRow,
  type ProblemPatchRow,
} from './problems.repository.js';
import type {
  CreateProblemInput,
  ListProblemsQuery,
  UpdateProblemInput,
} from './schemas/problems.schema.js';
import { problemIdParamSchema } from './schemas/problems.schema.js';

const DUPLICATE_CONSTRAINT = 'problems_user_normalized_url_uniq';

function isDuplicateUrl(error: unknown): boolean {
  const cause =
    (error as { cause?: { code?: string; constraint?: string } })?.cause ??
    (error as { code?: string; constraint?: string });
  return (
    cause.code === '23505' && cause.constraint === DUPLICATE_CONSTRAINT
  );
}

function dedupeIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

export function toProblemResponse(detail: ProblemDetail) {
  const { problem, topics } = detail;
  return {
    id: problem.id,
    title: problem.title,
    url: problem.url,
    platformProblemId: problem.platformProblemId,
    difficulty: problem.difficulty,
    rating: problem.rating,
    notes: problem.notes,
    status: problem.status,
    solvedAt: problem.solvedAt?.toISOString() ?? null,
    topics,
    createdAt: problem.createdAt.toISOString(),
    updatedAt: problem.updatedAt.toISOString(),
  };
}

@Injectable()
export class ProblemsService {
  constructor(private readonly repo: ProblemsRepository) {}

  private parseId(problemId: string): string {
    const result = problemIdParamSchema.safeParse(problemId);
    if (!result.success)
      throw problemError(400, 'VALIDATION_ERROR', 'Invalid input.', {
        problemId: 'Invalid problem id.',
      });
    return result.data;
  }

  private titleFromRaw(raw: string): string {
    try {
      return prepareProblemTitle(raw);
    } catch (error) {
      if (error instanceof ProblemTitleError)
        throw problemError(400, 'VALIDATION_ERROR', error.message, {
          title: error.message,
        });
      throw error;
    }
  }

  private urlFromRaw(raw: string) {
    try {
      return prepareProblemUrl(raw);
    } catch (error) {
      if (error instanceof ProblemUrlError)
        throw problemError(400, 'VALIDATION_ERROR', error.message, {
          url: error.message,
        });
      throw error;
    }
  }

  private async assertTopicIdsOwned(userId: string, topicIds: string[]) {
    const unique = dedupeIds(topicIds);
    if (unique.length === 0) return unique;
    const owned = await this.repo.countOwnedTopics(userId, unique);
    if (owned !== unique.length)
      throw problemError(400, 'VALIDATION_ERROR', 'Invalid input.', {
        topicIds: 'One or more topics were not found.',
      });
    return unique;
  }

  private async throwDuplicateUrl(
    userId: string,
    normalizedUrl: string,
  ): Promise<never> {
    const existingId = await this.repo.findIdByNormalizedUrl(
      userId,
      normalizedUrl,
    );
    throw problemError(
      409,
      'PROBLEM_URL_IN_USE',
      'You already saved a problem with this URL.',
      existingId ? { existingProblemId: existingId } : undefined,
    );
  }

  async getList(userId: string, query: ListProblemsQuery) {
    if (query.topicId) {
      const ok = await this.repo.topicOwnedByUser(userId, query.topicId);
      if (!ok)
        throw problemError(404, 'NOT_FOUND', 'Topic was not found.');
    }

    const effectiveTopicIds = dedupeIds([
      ...(query.topicIds ?? []),
      ...(query.topicId ? [query.topicId] : []),
    ]);
    if (effectiveTopicIds.length > 0)
      await this.assertTopicIdsOwned(userId, effectiveTopicIds);

    let platformHostname: string | undefined;
    if (query.platform) {
      platformHostname = await this.repo.findPlatformHostname(query.platform);
      if (!platformHostname) {
        throw problemError(400, 'VALIDATION_ERROR', 'Invalid input.', {
          platform: 'Unknown platform.',
        });
      }
    }

    const { items, total } = await this.repo.list({
      userId,
      page: query.page,
      pageSize: query.pageSize,
      q: query.q,
      status: query.status,
      platformHostname,
      topicIds:
        effectiveTopicIds.length > 0 ? effectiveTopicIds : undefined,
      untagged: query.untagged,
      sort: query.sort,
      order: query.order,
    });
    return {
      items: items.map(toProblemResponse),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
      },
    };
  }

  async getOne(userId: string, rawProblemId: string) {
    const problemId = this.parseId(rawProblemId);
    const detail = await this.repo.findDetailed(userId, problemId);
    if (!detail)
      throw problemError(404, 'NOT_FOUND', 'Problem was not found.');
    return toProblemResponse(detail);
  }

  async create(userId: string, input: CreateProblemInput) {
    const title = this.titleFromRaw(input.title);
    const { url, normalizedUrl } = this.urlFromRaw(input.url);
    const topicIds = await this.assertTopicIdsOwned(userId, input.topicIds);
    const solvedAt = input.status === 'solved' ? new Date() : null;
    const row: ProblemInsertRow = {
      title,
      url,
      normalizedUrl,
      platformProblemId: input.platformProblemId ?? null,
      difficulty: input.difficulty ?? null,
      rating: input.rating ?? null,
      notes: input.notes ?? null,
      status: input.status,
      solvedAt,
    };
    try {
      const detail = await this.repo.createWithTopics(userId, row, topicIds);
      return toProblemResponse(detail);
    } catch (error) {
      if (isDuplicateUrl(error))
        await this.throwDuplicateUrl(userId, normalizedUrl);
      throw error;
    }
  }

  private hasNonCompletionPatchFields(input: UpdateProblemInput): boolean {
    return (
      input.title !== undefined ||
      input.url !== undefined ||
      input.topicIds !== undefined ||
      input.platformProblemId !== undefined ||
      input.difficulty !== undefined ||
      input.rating !== undefined ||
      input.notes !== undefined
    );
  }

  async update(
    userId: string,
    rawProblemId: string,
    input: UpdateProblemInput,
  ) {
    const problemId = this.parseId(rawProblemId);

    let existingDetail: ProblemDetail | undefined;
    if (input.status !== undefined) {
      existingDetail = await this.repo.findDetailed(userId, problemId);
      if (!existingDetail)
        throw problemError(404, 'NOT_FOUND', 'Problem was not found.');
    }

    const patch: ProblemPatchRow = {};
    if (input.title !== undefined) patch.title = this.titleFromRaw(input.title);
    let normalizedUrl: string | undefined;
    if (input.url !== undefined) {
      const prepared = this.urlFromRaw(input.url);
      patch.url = prepared.url;
      patch.normalizedUrl = prepared.normalizedUrl;
      normalizedUrl = prepared.normalizedUrl;
    }
    if (input.platformProblemId !== undefined)
      patch.platformProblemId = input.platformProblemId;
    if (input.difficulty !== undefined) patch.difficulty = input.difficulty;
    if (input.rating !== undefined) patch.rating = input.rating;
    if (input.notes !== undefined) patch.notes = input.notes;

    if (input.status !== undefined && existingDetail) {
      const completion = applyCompletionTransition(
        {
          status: existingDetail.problem.status,
          solvedAt: existingDetail.problem.solvedAt,
        },
        input.status,
        new Date(),
      );
      if (completion) {
        patch.status = completion.status;
        patch.solvedAt = completion.solvedAt;
      } else if (!this.hasNonCompletionPatchFields(input)) {
        return toProblemResponse(existingDetail);
      }
    }

    let topicIds: string[] | undefined;
    if (input.topicIds !== undefined)
      topicIds = await this.assertTopicIdsOwned(userId, input.topicIds);

    try {
      const detail = await this.repo.updateWithTopics(
        userId,
        problemId,
        patch,
        topicIds,
      );
      if (!detail)
        throw problemError(404, 'NOT_FOUND', 'Problem was not found.');
      return toProblemResponse(detail);
    } catch (error) {
      if (error instanceof Error && 'getStatus' in error) throw error;
      if (isDuplicateUrl(error) && normalizedUrl)
        await this.throwDuplicateUrl(userId, normalizedUrl);
      if (isDuplicateUrl(error)) {
        throw problemError(
          409,
          'PROBLEM_URL_IN_USE',
          'You already saved a problem with this URL.',
        );
      }
      throw error;
    }
  }

  async remove(userId: string, rawProblemId: string): Promise<void> {
    const problemId = this.parseId(rawProblemId);
    const deleted = await this.repo.delete(userId, problemId);
    if (!deleted)
      throw problemError(404, 'NOT_FOUND', 'Problem was not found.');
  }
}