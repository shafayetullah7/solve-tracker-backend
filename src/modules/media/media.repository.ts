import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import { media } from '../../database/schema/index.js';
import type { MediaRecord, NewMediaRecord } from '../../database/schema/media/media.table.js';

@Injectable()
export class MediaRepository {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  async insert(values: NewMediaRecord): Promise<MediaRecord> {
    const now = new Date();
    return (
      await this.db
        .insert(media)
        .values({
          ...values,
          createdAt: values.createdAt ?? now,
          updatedAt: values.updatedAt ?? now,
        })
        .returning()
    )[0]!;
  }

  async findOwned(userId: string, mediaId: string): Promise<MediaRecord | undefined> {
    return (
      await this.db
        .select()
        .from(media)
        .where(and(eq(media.id, mediaId), eq(media.userId, userId)))
        .limit(1)
    )[0];
  }
}