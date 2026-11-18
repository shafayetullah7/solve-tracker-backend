import { Injectable } from '@nestjs/common';
import { and, eq, gte, sql } from 'drizzle-orm';
import { topics } from '../../database/schema/index.js';
import { DatabaseService } from '../../database/database.service.js';
import { discoverDailyCounters } from '../../database/schema/index.js';

const SUBJECT_PROFILE = 'profile';
const SUBJECT_TOPIC = 'topic';
const DEDUPE_MAX = 50_000;

function utcDayString(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

@Injectable()
export class DiscoverCountersService {
  private readonly viewDedupe = new Map<string, true>();

  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  private dedupeKey(
    viewerId: string,
    subjectType: string,
    subjectId: string,
    day: string,
  ): string {
    return `${viewerId}:${subjectType}:${subjectId}:${day}`;
  }

  private shouldCountView(
    viewerId: string,
    subjectUserId: string,
    subjectType: string,
    subjectId: string,
  ): boolean {
    if (viewerId === subjectUserId) return false;
    const day = utcDayString();
    const key = this.dedupeKey(viewerId, subjectType, subjectId, day);
    if (this.viewDedupe.has(key)) return false;
    if (this.viewDedupe.size >= DEDUPE_MAX) {
      const first = this.viewDedupe.keys().next().value;
      if (first) this.viewDedupe.delete(first);
    }
    this.viewDedupe.set(key, true);
    return true;
  }

  async recordProfileView(viewerId: string, subjectUserId: string): Promise<void> {
    if (!this.shouldCountView(viewerId, subjectUserId, SUBJECT_PROFILE, subjectUserId)) {
      return;
    }
    await this.incrementView(SUBJECT_PROFILE, subjectUserId);
  }

  async recordTopicView(
    viewerId: string,
    subjectUserId: string,
    topicId: string,
  ): Promise<void> {
    if (!this.shouldCountView(viewerId, subjectUserId, SUBJECT_TOPIC, topicId)) {
      return;
    }
    await this.incrementView(SUBJECT_TOPIC, topicId);
  }

  private parseUtcDay(day: string): Date {
    return new Date(`${day}T00:00:00.000Z`);
  }

  private async incrementView(subjectType: string, subjectId: string): Promise<void> {
    const day = utcDayString();
    await this.db
      .insert(discoverDailyCounters)
      .values({
        subjectType,
        subjectId,
        day: this.parseUtcDay(day),
        views: 1,
        copies: 0,
      })
      .onConflictDoUpdate({
        target: [
          discoverDailyCounters.subjectType,
          discoverDailyCounters.subjectId,
          discoverDailyCounters.day,
        ],
        set: {
          views: sql`${discoverDailyCounters.views} + 1`,
        },
      });
  }

  private readonly copyDedupe = new Map<string, true>();

  private shouldCountCopy(
    viewerId: string,
    subjectUserId: string,
    topicId: string,
  ): boolean {
    if (viewerId === subjectUserId) return false;
    const day = utcDayString();
    const key = `${viewerId}:copy:${topicId}:${day}`;
    if (this.copyDedupe.has(key)) return false;
    if (this.copyDedupe.size >= DEDUPE_MAX) {
      const first = this.copyDedupe.keys().next().value;
      if (first) this.copyDedupe.delete(first);
    }
    this.copyDedupe.set(key, true);
    return true;
  }

  async recordTopicCopy(
    viewerId: string,
    subjectUserId: string,
    topicId: string,
  ): Promise<void> {
    if (!this.shouldCountCopy(viewerId, subjectUserId, topicId)) {
      return;
    }
    await this.incrementCopy(SUBJECT_TOPIC, topicId);
  }

  private async incrementCopy(subjectType: string, subjectId: string): Promise<void> {
    const day = utcDayString();
    await this.db
      .insert(discoverDailyCounters)
      .values({
        subjectType,
        subjectId,
        day: this.parseUtcDay(day),
        views: 0,
        copies: 1,
      })
      .onConflictDoUpdate({
        target: [
          discoverDailyCounters.subjectType,
          discoverDailyCounters.subjectId,
          discoverDailyCounters.day,
        ],
        set: {
          copies: sql`${discoverDailyCounters.copies} + 1`,
        },
      });
  }

  async aggregateShareStats(
    userId: string,
    days: number,
  ): Promise<{
    profileViews: number;
    topicCopies: number;
    topics: Array<{ topicId: string; views: number; copies: number }>;
  }> {
    const profileViews = await this.sumMetricLastDays(
      SUBJECT_PROFILE,
      userId,
      days,
      'views',
    );
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - (days - 1));
    since.setUTCHours(0, 0, 0, 0);

    const owned = await this.db
      .select({ id: topics.id, isPublic: topics.isPublic })
      .from(topics)
      .where(eq(topics.userId, userId));

    const topicRows = [];
    let topicCopies = 0;
    for (const t of owned) {
      const views = await this.sumMetricLastDays(SUBJECT_TOPIC, t.id, days, 'views');
      const copies = await this.sumMetricLastDays(SUBJECT_TOPIC, t.id, days, 'copies');
      topicCopies += copies;
      if (t.isPublic) {
        topicRows.push({ topicId: t.id, views, copies });
      }
    }

    return { profileViews, topicCopies, topics: topicRows };
  }

  async sumMetricLastDays(
    subjectType: string,
    subjectId: string,
    days: number,
    metric: 'views' | 'copies',
  ): Promise<number> {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - (days - 1));
    since.setUTCHours(0, 0, 0, 0);
    const column =
      metric === 'views'
        ? discoverDailyCounters.views
        : discoverDailyCounters.copies;
    const [row] = await this.db
      .select({
        total: sql<string>`coalesce(sum(${column}), 0)::text`,
      })
      .from(discoverDailyCounters)
      .where(
        and(
          eq(discoverDailyCounters.subjectType, subjectType),
          eq(discoverDailyCounters.subjectId, subjectId),
          gte(discoverDailyCounters.day, since),
        ),
      );
    return Number(row?.total ?? 0);
  }
}