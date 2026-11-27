import { Injectable } from '@nestjs/common';
import { and, eq, gte, inArray, isNotNull, ne, notInArray, sql } from 'drizzle-orm';
import type { PracticeVisibility } from '../../common/schemas/practice-discovery.schema.js';
import { DatabaseService } from '../../database/database.service.js';
import {
  problemTopics,
  problems,
  topics,
  users,
} from '../../database/schema/index.js';
import { practiceVisibility } from '../../database/schema/users/practice-visibility.enum.js';
import { MIN_PROBLEMS_FOR_DISCOVERY } from './discover.config.js';

const EXCLUDED_DISCOVER_HANDLES = new Set(['starter']);
import type { DiscoverPersonSnapshot } from './discover-candidate.types.js';
import { computeSolveStreak } from '../progress/progress-activity-streak.js';
import {
  buildWeekRange,
  mergeActivityWeeks,
} from '../progress/progress-activity-weeks.js';

@Injectable()
export class DiscoverRepository {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  async loadPersonSnapshot(userId: string): Promise<DiscoverPersonSnapshot | undefined> {
    const snapshots = await this.loadPersonSnapshots([userId]);
    return snapshots[0];
  }

  async loadEligibleCandidates(
    viewerId: string,
    excludeUserIds: string[] = [],
  ): Promise<DiscoverPersonSnapshot[]> {
    const eligibleCounts = await this.db
      .select({ userId: problems.userId })
      .from(problems)
      .groupBy(problems.userId)
      .having(sql`count(*) >= ${MIN_PROBLEMS_FOR_DISCOVERY}`);

    const eligibleIds = eligibleCounts.map((r) => r.userId);
    if (eligibleIds.length === 0) return [];

    const eligible = await this.db
      .select({ userId: users.id })
      .from(users)
      .where(
        and(
          ne(users.practiceVisibility, practiceVisibility.Private),
          ne(users.id, viewerId),
          inArray(users.id, eligibleIds),
          ...(excludeUserIds.length > 0
            ? [notInArray(users.id, excludeUserIds)]
            : []),
        ),
      );

    const eligibleUsers = await this.db
      .select({ id: users.id, handle: users.handle })
      .from(users)
      .where(inArray(users.id, eligible.map((r) => r.userId)));

    const ids = eligibleUsers
      .filter((u) => !EXCLUDED_DISCOVER_HANDLES.has(u.handle.toLowerCase()))
      .map((u) => u.id);
    if (ids.length === 0) return [];
    return this.loadPersonSnapshots(ids);
  }

  async loadPersonSnapshots(
    userIds: string[],
  ): Promise<DiscoverPersonSnapshot[]> {
    if (userIds.length === 0) return [];

    const userRows = await this.db
      .select({
        id: users.id,
        handle: users.handle,
        name: users.name,
        avatarMediaId: users.avatarMediaId,
        visibility: users.practiceVisibility,
        practiceGoal: users.practiceGoal,
      })
      .from(users)
      .where(inArray(users.id, userIds));

    const countRows = await this.db
      .select({
        userId: problems.userId,
        total: sql<number>`count(*)::int`,
        solved: sql<number>`count(*) filter (where ${problems.status} = 'solved')::int`,
      })
      .from(problems)
      .where(inArray(problems.userId, userIds))
      .groupBy(problems.userId);

    const countByUser = new Map(
      countRows.map((r) => [r.userId, { total: r.total, solved: r.solved }]),
    );

    const platformRows = await this.db
      .select({
        userId: problems.userId,
        slug: problems.platformSlug,
        total: sql<number>`count(*)::int`,
        solved: sql<number>`count(*) filter (where ${problems.status} = 'solved')::int`,
      })
      .from(problems)
      .where(inArray(problems.userId, userIds))
      .groupBy(problems.userId, problems.platformSlug);

    const platformsByUser = new Map<string, DiscoverPersonSnapshot['platforms']>();
    for (const row of platformRows) {
      const list = platformsByUser.get(row.userId) ?? [];
      list.push({ slug: row.slug, total: row.total, solved: row.solved });
      platformsByUser.set(row.userId, list);
    }

    const topicRows = await this.db
      .select({
        userId: topics.userId,
        normalizedName: topics.normalizedName,
        total: sql<number>`count(${problems.id})::int`,
        solved: sql<number>`count(*) filter (where ${problems.status} = 'solved')::int`,
      })
      .from(topics)
      .leftJoin(problemTopics, eq(problemTopics.topicId, topics.id))
      .leftJoin(
        problems,
        and(
          eq(problemTopics.problemId, problems.id),
          eq(problems.userId, topics.userId),
        ),
      )
      .where(inArray(topics.userId, userIds))
      .groupBy(topics.userId, topics.normalizedName);

    const topicsByUser = new Map<string, DiscoverPersonSnapshot['topicStats']>();
    for (const row of topicRows) {
      const list = topicsByUser.get(row.userId) ?? [];
      list.push({
        normalizedName: row.normalizedName,
        total: row.total,
        solved: row.solved,
      });
      topicsByUser.set(row.userId, list);
    }

    const now = new Date();
    const weekStarts = buildWeekRange(12, now);
    const since = new Date(`${weekStarts[0]}T00:00:00.000Z`);

    const solvedWeekRows = await this.db
      .select({
        userId: problems.userId,
        weekStart: sql<string>`(date_trunc('week', ${problems.solvedAt})::date)::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(problems)
      .where(
        and(
          inArray(problems.userId, userIds),
          isNotNull(problems.solvedAt),
          gte(problems.solvedAt, since),
        ),
      )
      .groupBy(problems.userId, sql`date_trunc('week', ${problems.solvedAt})::date`);

    const weeklyByUser = new Map<string, Map<string, number>>();
    for (const row of solvedWeekRows) {
      const map = weeklyByUser.get(row.userId) ?? new Map();
      map.set(row.weekStart, row.count);
      weeklyByUser.set(row.userId, map);
    }

    const solveDateRows = await this.db
      .select({
        userId: problems.userId,
        solveDay: sql<string>`(${problems.solvedAt}::date)::text`,
      })
      .from(problems)
      .where(and(inArray(problems.userId, userIds), isNotNull(problems.solvedAt)))
      .groupBy(problems.userId, sql`${problems.solvedAt}::date`);

    const solveDatesByUser = new Map<string, string[]>();
    for (const row of solveDateRows) {
      const list = solveDatesByUser.get(row.userId) ?? [];
      list.push(row.solveDay);
      solveDatesByUser.set(row.userId, list);
    }

    return userRows.map((user) => {
      const counts = countByUser.get(user.id) ?? { total: 0, solved: 0 };
      const visibility = user.visibility as PracticeVisibility;
      const topicStats = topicsByUser.get(user.id) ?? [];
      const topicNames =
        visibility === 'topics'
          ? topicStats.map((t) => t.normalizedName)
          : [];

      const solvedMap = weeklyByUser.get(user.id) ?? new Map();
      const weeks = mergeActivityWeeks(
        weekStarts,
        [],
        [...solvedMap.entries()].map(([weekStart, count]) => ({
          weekStart,
          count,
        })),
      );
      const activeWeeks = weeks.map((w) => w.solved > 0);
      const solvesThisWeek = weeks.at(-1)?.solved ?? 0;
      const solveDates = solveDatesByUser.get(user.id) ?? [];
      const streak = computeSolveStreak(solveDates, now);

      return {
        userId: user.id,
        handle: user.handle,
        name: user.name,
        avatarMediaId: user.avatarMediaId,
        visibility,
        practiceGoal: user.practiceGoal,
        total: counts.total,
        solved: counts.solved,
        topicNames,
        topicStats,
        platforms: platformsByUser.get(user.id) ?? [],
        activeWeeks,
        solvesThisWeek,
        streakDays: streak.currentDays,
        solveDates,
      };
    });
  }

  async searchDiscoverablePeople(
    viewerId: string,
    query: string,
    limit: number,
    excludeUserIds: string[] = [],
  ): Promise<DiscoverPersonSnapshot[]> {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    const eligibleCounts = await this.db
      .select({ userId: problems.userId })
      .from(problems)
      .groupBy(problems.userId)
      .having(sql`count(*) >= ${MIN_PROBLEMS_FOR_DISCOVERY}`);
    const eligibleIds = eligibleCounts.map((r) => r.userId);
    if (eligibleIds.length === 0) return [];

    const rows = await this.db
      .select({ userId: users.id })
      .from(users)
      .where(
        and(
          ne(users.practiceVisibility, practiceVisibility.Private),
          ne(users.id, viewerId),
          inArray(users.id, eligibleIds),
          ...(excludeUserIds.length > 0
            ? [notInArray(users.id, excludeUserIds)]
            : []),
          sql`(
            lower(${users.handle}) like ${q + '%'}
            or lower(${users.name}) like ${'%' + q + '%'}
          )`,
        ),
      )
      .limit(limit);

    const ids = rows.map((r) => r.userId);
    return this.loadPersonSnapshots(ids);
  }
}