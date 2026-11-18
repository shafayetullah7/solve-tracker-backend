import { Injectable } from '@nestjs/common';
import { and, count, desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import { userFollows } from '../../database/schema/index.js';

@Injectable()
export class FollowsRepository {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  async insertFollow(followerId: string, followeeId: string): Promise<void> {
    await this.db
      .insert(userFollows)
      .values({ followerId, followeeId })
      .onConflictDoNothing();
  }

  async deleteFollow(followerId: string, followeeId: string): Promise<void> {
    await this.db
      .delete(userFollows)
      .where(
        and(
          eq(userFollows.followerId, followerId),
          eq(userFollows.followeeId, followeeId),
        ),
      );
  }

  async isFollowing(followerId: string, followeeId: string): Promise<boolean> {
    const rows = await this.db
      .select({ followerId: userFollows.followerId })
      .from(userFollows)
      .where(
        and(
          eq(userFollows.followerId, followerId),
          eq(userFollows.followeeId, followeeId),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  async listFolloweeIds(
    followerId: string,
    limit: number,
    offset: number,
  ): Promise<{ ids: string[]; total: number }> {
    const [{ total }] = await this.db
      .select({ total: count() })
      .from(userFollows)
      .where(eq(userFollows.followerId, followerId));

    const rows = await this.db
      .select({ followeeId: userFollows.followeeId })
      .from(userFollows)
      .where(eq(userFollows.followerId, followerId))
      .orderBy(desc(userFollows.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      ids: rows.map((r) => r.followeeId),
      total: Number(total),
    };
  }

  async countFollowers(followeeId: string): Promise<number> {
    const [{ value }] = await this.db
      .select({ value: count() })
      .from(userFollows)
      .where(eq(userFollows.followeeId, followeeId));
    return Number(value);
  }
}