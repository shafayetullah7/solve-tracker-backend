import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, isNull, isNotNull, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import { learningGuides } from '../../database/schema/index.js';
import type { LearningGuide } from '../../database/schema/index.js';
import type { ListGuidesQuery } from './schemas/learning-guides.schema.js';

@Injectable()
export class LearningGuidesRepository {
  constructor(private readonly database: DatabaseService) {}

  async findOwned(ownerId: string, guideId: string): Promise<LearningGuide | undefined> {
    const [row] = await this.database.db.select().from(learningGuides).where(and(
      eq(learningGuides.ownerId, ownerId),
      eq(learningGuides.id, guideId),
      isNull(learningGuides.deletedAt),
    ));
    return row;
  }

  async listOwned(ownerId: string, query: ListGuidesQuery): Promise<{ items: LearningGuide[]; total: number }> {
    const search = query.search?.toLowerCase();
    const where = and(
      eq(learningGuides.ownerId, ownerId),
      isNull(learningGuides.deletedAt),
      query.status === 'archived' ? isNotNull(learningGuides.archivedAt) : isNull(learningGuides.archivedAt),
      search ? sql`strpos(lower(${learningGuides.title}), ${search}) > 0 or strpos(lower(${learningGuides.description}), ${search}) > 0` : undefined,
    );
    const [total] = await this.database.db.select({ total: count() }).from(learningGuides).where(where);
    const items = await this.database.db.select().from(learningGuides).where(where)
      .orderBy(desc(learningGuides.updatedAt), desc(learningGuides.id))
      .limit(query.pageSize).offset((query.page - 1) * query.pageSize);
    return { items, total: total?.total ?? 0 };
  }
}
