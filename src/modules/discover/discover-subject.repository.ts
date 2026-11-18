import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import { users } from '../../database/schema/index.js';
import type { PracticeVisibility } from '../../common/schemas/practice-discovery.schema.js';

export type DiscoverSubjectRow = {
  userId: string;
  visibility: PracticeVisibility;
  practiceGoal: string | null;
  publicWeb: boolean;
  handle: string;
  name: string;
  bio: string;
  avatarMediaId: string | null;
  createdAt: Date;
};

@Injectable()
export class DiscoverSubjectRepository {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  async findByHandle(handle: string): Promise<DiscoverSubjectRow | undefined> {
    const normalized = handle.trim().toLowerCase();
    const rows = await this.db
      .select({
        userId: users.id,
        visibility: users.practiceVisibility,
        practiceGoal: users.practiceGoal,
        publicWeb: users.publicWeb,
        handle: users.handle,
        name: users.name,
        bio: users.bio,
        avatarMediaId: users.avatarMediaId,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(sql`lower(${users.handle}) = ${normalized}`)
      .limit(1);
    const row = rows[0];
    if (!row) return undefined;
    return {
      userId: row.userId,
      visibility: row.visibility as PracticeVisibility,
      practiceGoal: row.practiceGoal,
      publicWeb: row.publicWeb,
      handle: row.handle,
      name: row.name,
      bio: row.bio,
      avatarMediaId: row.avatarMediaId,
      createdAt: row.createdAt,
    };
  }
}