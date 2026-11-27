import { Injectable } from '@nestjs/common';
import type { LearningGuide } from '../../database/schema/index.js';
import { LearningGuidesRepository } from './learning-guides.repository.js';
import { learningError } from './learning.errors.js';
import { guideIdSchema, type GuideResponse, type ListGuidesQuery } from './schemas/learning-guides.schema.js';

export function toGuideResponse(row: LearningGuide): GuideResponse {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    structureRevision: row.structureRevision.toString(),
    metadataRevision: row.metadataRevision.toString(),
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class LearningGuidesService {
  constructor(private readonly repository: LearningGuidesRepository) {}

  async get(ownerId: string, rawGuideId: string): Promise<GuideResponse> {
    const id = guideIdSchema.safeParse(rawGuideId);
    if (!id.success) throw learningError(400, 'VALIDATION_ERROR', 'Invalid guide id.');
    const row = await this.repository.findOwned(ownerId, id.data);
    if (!row) throw learningError(404, 'NOT_FOUND', 'Guide was not found.');
    return toGuideResponse(row);
  }

  async list(ownerId: string, query: ListGuidesQuery) {
    const { items, total } = await this.repository.listOwned(ownerId, query);
    return { items: items.map(toGuideResponse), meta: { page: query.page, pageSize: query.pageSize, total } };
  }
}
