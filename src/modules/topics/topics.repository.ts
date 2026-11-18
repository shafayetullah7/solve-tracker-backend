import { Injectable } from '@nestjs/common';
import { and, asc, count, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import { topics } from '../../database/schema/index.js';
import type { Topic } from '../../database/schema/index.js';

@Injectable()
export class TopicsRepository {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  async list(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: Topic[]; total: number }> {
    const where = eq(topics.userId, userId);
    const offset = (page - 1) * pageSize;
    const [totalRow] = await this.db
      .select({ total: count() })
      .from(topics)
      .where(where);
    const items = await this.db
      .select()
      .from(topics)
      .where(where)
      .orderBy(asc(topics.name), asc(topics.id))
      .limit(pageSize)
      .offset(offset);
    return { items, total: Number(totalRow?.total ?? 0) };
  }

  async insert(
    userId: string,
    name: string,
    normalizedName: string,
  ): Promise<Topic> {
    const now = new Date();
    return (
      await this.db
        .insert(topics)
        .values({
          userId,
          name,
          normalizedName,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
    )[0]!;
  }

  async updateFields(
    userId: string,
    topicId: string,
    fields: {
      name?: string;
      normalizedName?: string;
      isPublic?: boolean;
      description?: string;
    },
  ): Promise<Topic | undefined> {
    const rows = await this.db
      .update(topics)
      .set({ ...fields, updatedAt: new Date() })
      .where(and(eq(topics.id, topicId), eq(topics.userId, userId)))
      .returning();
    return rows[0];
  }

  async delete(userId: string, topicId: string): Promise<boolean> {
    const rows = await this.db
      .delete(topics)
      .where(and(eq(topics.id, topicId), eq(topics.userId, userId)))
      .returning({ id: topics.id });
    return rows.length > 0;
  }
}