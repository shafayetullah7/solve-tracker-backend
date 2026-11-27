import { Injectable } from '@nestjs/common';
import type { LearningGuide } from '../../database/schema/index.js';
import { LearningGuideMutationsRepository } from './learning-guide-mutations.repository.js';
import { LearningGuidesRepository } from './learning-guides.repository.js';
import { learningError } from './learning.errors.js';
import { guideIdSchema, type GuideResponse, type ListGuidesQuery, type CreateGuideInput, type PatchGuideInput, type GuideLifecycleInput, revisionSchema } from './schemas/learning-guides.schema.js';

export function toGuideResponse(row: LearningGuide): GuideResponse {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    structureRevision: row.structureRevision.toString(),
    metadataRevision: row.metadataRevision.toString(),
    archivedAt: row.archivedAt?.toISOString() ?? null,
    deletedAt: row.deletedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class LearningGuidesService {
  constructor(private readonly repository: LearningGuidesRepository, private readonly mutations: LearningGuideMutationsRepository) {}

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

  private parseId(raw: string): string {
    const id = guideIdSchema.safeParse(raw);
    if (!id.success) throw learningError(400, 'VALIDATION_ERROR', 'Invalid guide id.');
    return id.data;
  }

  create(ownerId: string, input: CreateGuideInput) {
    return this.mutations.create(ownerId, input);
  }

  patch(ownerId: string, id: string, input: PatchGuideInput) {
    return this.mutations.patch(ownerId, this.parseId(id), input);
  }

  lifecycle(ownerId: string, id: string, input: GuideLifecycleInput) {
    return this.mutations.lifecycle(ownerId, this.parseId(id), input.action, input.expectedMetadataRevision, input.operationId);
  }

  async remove(ownerId: string, id: string, rawRevision: unknown, rawOperation: unknown): Promise<void> {
    const revision = revisionSchema.safeParse(rawRevision);
    const operation = guideIdSchema.safeParse(rawOperation);
    if (!revision.success || !operation.success)
      throw learningError(400, 'VALIDATION_ERROR', 'Valid revision and operation headers are required.');
    await this.mutations.lifecycle(ownerId, this.parseId(id), 'delete', revision.data, operation.data);
  }
}
