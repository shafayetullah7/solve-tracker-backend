import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import { discoverReports, userBlocks } from '../../database/schema/index.js';

@Injectable()
export class DiscoverSafetyRepository {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  async insertBlock(blockerId: string, blockedId: string): Promise<void> {
    await this.db
      .insert(userBlocks)
      .values({ blockerId, blockedId })
      .onConflictDoNothing();
  }

  async deleteBlock(blockerId: string, blockedId: string): Promise<void> {
    await this.db
      .delete(userBlocks)
      .where(
        and(
          eq(userBlocks.blockerId, blockerId),
          eq(userBlocks.blockedId, blockedId),
        ),
      );
  }

  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const rows = await this.db
      .select({ blockerId: userBlocks.blockerId })
      .from(userBlocks)
      .where(
        and(
          eq(userBlocks.blockerId, blockerId),
          eq(userBlocks.blockedId, blockedId),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  async listBlockedIds(blockerId: string): Promise<string[]> {
    const rows = await this.db
      .select({ blockedId: userBlocks.blockedId })
      .from(userBlocks)
      .where(eq(userBlocks.blockerId, blockerId));
    return rows.map((r) => r.blockedId);
  }

  async insertReport(
    reporterId: string,
    reportedUserId: string,
    reason: string,
  ): Promise<void> {
    await this.db.insert(discoverReports).values({
      reporterId,
      reportedUserId,
      reason,
    });
  }
}