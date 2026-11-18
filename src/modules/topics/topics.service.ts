import { Injectable } from '@nestjs/common';
import type { Topic } from '../../database/schema/index.js';
import {
  prepareTopicName,
  TopicNameError,
} from './topic-name.js';
import { TopicsRepository } from './topics.repository.js';
import { topicError } from './topics.errors.js';
import { bumpDiscoverVersion } from '../discover/discover-cache.js';
import type { ListTopicsQuery, PatchTopicInput } from './schemas/topics.schema.js';
import { topicIdParamSchema } from './schemas/topics.schema.js';

const DUPLICATE_CONSTRAINT = 'topics_user_normalized_name_uniq';

function isDuplicateName(error: unknown): boolean {
  const cause =
    (error as { cause?: { code?: string; constraint?: string } })?.cause ??
    (error as { code?: string; constraint?: string });
  return (
    cause.code === '23505' && cause.constraint === DUPLICATE_CONSTRAINT
  );
}

export function toTopicResponse(row: Topic) {
  return {
    id: row.id,
    name: row.name,
    isPublic: row.isPublic,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class TopicsService {
  constructor(private readonly repo: TopicsRepository) {}

  private parseId(topicId: string): string {
    const result = topicIdParamSchema.safeParse(topicId);
    if (!result.success)
      throw topicError(400, 'VALIDATION_ERROR', 'Invalid input.', {
        topicId: 'Invalid topic id.',
      });
    return result.data;
  }

  private nameFromRaw(raw: string) {
    try {
      return prepareTopicName(raw);
    } catch (error) {
      if (error instanceof TopicNameError)
        throw topicError(400, 'VALIDATION_ERROR', error.message, {
          name: error.message,
        });
      throw error;
    }
  }

  async getList(userId: string, query: ListTopicsQuery) {
    const { items, total } = await this.repo.list(
      userId,
      query.page,
      query.pageSize,
    );
    return {
      items: items.map(toTopicResponse),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
      },
    };
  }

  async create(userId: string, rawName: string) {
    const { name, normalizedName } = this.nameFromRaw(rawName);
    try {
      return toTopicResponse(
        await this.repo.insert(userId, name, normalizedName),
      );
    } catch (error) {
      if (isDuplicateName(error))
        throw topicError(409, 'TOPIC_NAME_IN_USE', 'Topic name already exists.');
      throw error;
    }
  }

  async patch(
    userId: string,
    rawTopicId: string,
    input: PatchTopicInput,
  ) {
    const topicId = this.parseId(rawTopicId);
    const updates: {
      name?: string;
      normalizedName?: string;
      isPublic?: boolean;
      description?: string;
    } = {};
    if (input.name !== undefined) {
      const { name, normalizedName } = this.nameFromRaw(input.name);
      updates.name = name;
      updates.normalizedName = normalizedName;
    }
    if (input.isPublic !== undefined) updates.isPublic = input.isPublic;
    if (input.description !== undefined) updates.description = input.description;

    try {
      const row = await this.repo.updateFields(userId, topicId, updates);
      if (!row)
        throw topicError(404, 'NOT_FOUND', 'Topic was not found.');
      if (input.isPublic !== undefined || input.description !== undefined) {
        bumpDiscoverVersion();
      }
      return toTopicResponse(row);
    } catch (error) {
      if (error instanceof Error && 'getStatus' in error) throw error;
      if (isDuplicateName(error))
        throw topicError(409, 'TOPIC_NAME_IN_USE', 'Topic name already exists.');
      throw error;
    }
  }

  async rename(userId: string, rawTopicId: string, rawName: string) {
    return this.patch(userId, rawTopicId, { name: rawName });
  }

  async remove(userId: string, rawTopicId: string): Promise<void> {
    const topicId = this.parseId(rawTopicId);
    const deleted = await this.repo.delete(userId, topicId);
    if (!deleted) throw topicError(404, 'NOT_FOUND', 'Topic was not found.');
  }
}