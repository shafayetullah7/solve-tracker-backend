import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { and, count, eq, inArray } from 'drizzle-orm';
import { practiceGoalSchema } from '../../common/schemas/practice-discovery.schema.js';
import { DatabaseService } from '../../database/database.service.js';
import {
  discoverEvents,
  problemTopics,
  problems,
  topics,
} from '../../database/schema/index.js';
import { MediaService } from '../media/media.service.js';
import {
  DISCOVER_CACHE_TTL_MS,
  DISCOVER_EVENT_NAMES,
  PEOPLE_PAGE_SIZE,
  RAIL_MIN_CARDS,
  SEARCH_MIN_LENGTH,
} from './discover.config.js';
import {
  discoverCacheGet,
  discoverCacheSet,
  getDiscoverVersion,
} from './discover-cache.js';
import type { DiscoverPersonSnapshot } from './discover-candidate.types.js';
import { DiscoverRepository } from './discover.repository.js';
import { DiscoverSubjectRepository } from './discover-subject.repository.js';
import { profileNotFound } from './discover.errors.js';
import { formatDiscoverReason } from './discover-reason-text.js';
import {
  buildRailByKind,
  buildSimilarPeople,
  type DiscoverRailKind,
  type ScoredPerson,
} from './rails.js';
import type {
  DiscoverEventsBody,
  PeopleListQuery,
  SearchQuery,
  SimilarQuery,
} from './schemas/discover.schema.js';
import { TopicDiscoverService } from './topic-discover.service.js';
import { FollowsService } from '../follows/follows.service.js';
import { DiscoverSafetyService } from '../discover-safety/discover-safety.service.js';
import { assertViewable } from './visibility.js';

const STARTER_HANDLE = 'starter';

@Injectable()
export class DiscoverService {
  constructor(
    private readonly database: DatabaseService,
    private readonly repository: DiscoverRepository,
    private readonly subjects: DiscoverSubjectRepository,
    private readonly media: MediaService,
    private readonly topicDiscover: TopicDiscoverService,
    private readonly follows: FollowsService,
    private readonly safety: DiscoverSafetyService,
  ) {}

  private get db() {
    return this.database.db;
  }

  private async avatarUrl(
    userId: string,
    avatarMediaId: string | null,
  ): Promise<string | undefined> {
    if (!avatarMediaId) return undefined;
    const row = await this.media.findOwnedRecord(userId, avatarMediaId);
    if (!row) return undefined;
    return this.media.deliveryUrl(row.publicId, row.extension);
  }

  private async toPersonCard(
    scored: ScoredPerson,
  ): Promise<{
    handle: string;
    name: string;
    avatarUrl?: string;
    practiceGoal: string | null;
    solved: number;
    streakDays: number;
    platforms: string[];
    reason: { kind: ScoredPerson['reason']['kind']; text: string; sharedTopics?: string[] };
  }> {
    const p = scored.person;
    const goal =
      p.practiceGoal === null
        ? null
        : practiceGoalSchema.parse(p.practiceGoal);
    const avatarUrl = await this.avatarUrl(p.userId, p.avatarMediaId);
    const platforms = p.platforms
      .sort((a, b) => b.total - a.total)
      .slice(0, 3)
      .map((x) => x.slug);
    return {
      handle: p.handle,
      name: p.name,
      ...(avatarUrl ? { avatarUrl } : {}),
      practiceGoal: goal,
      solved: p.solved,
      streakDays: p.streakDays,
      platforms,
      reason: {
        kind: scored.reason.kind,
        text: formatDiscoverReason(scored.reason),
        ...(scored.reason.sharedTopics
          ? { sharedTopics: scored.reason.sharedTopics }
          : {}),
      },
    };
  }

  private blockedIds(viewerId: string) {
    return this.safety.listBlockedIds(viewerId);
  }

  private async loadContext(viewerId: string) {
    const viewer = await this.repository.loadPersonSnapshot(viewerId);
    if (!viewer) throw profileNotFound();
    const blocked = await this.blockedIds(viewerId);
    const candidates = await this.repository.loadEligibleCandidates(
      viewerId,
      blocked,
    );
    return { viewer, candidates };
  }

  private filterRails(rails: { kind: DiscoverRailKind; people: ScoredPerson[] }[]) {
    return rails
      .map((r) => ({
        kind: r.kind,
        people: r.people,
      }))
      .filter((r) => r.people.length >= RAIL_MIN_CARDS);
  }

  async search(viewerId: string, query: SearchQuery) {
    if (query.q.trim().length < SEARCH_MIN_LENGTH) {
      return { items: [] };
    }
    const blocked = await this.blockedIds(viewerId);
    const snapshots = await this.repository.searchDiscoverablePeople(
      viewerId,
      query.q,
      query.limit,
      blocked,
    );
    const viewer = await this.repository.loadPersonSnapshot(viewerId);
    if (!viewer) throw profileNotFound();
    const scored = snapshots.map((person) => ({
      person,
      score: 1,
      reason: {
        kind: 'shared_topics_platforms_cadence' as const,
        values: {},
      },
    }));
    const items = await Promise.all(scored.map((s) => this.toPersonCard(s)));
    return { items };
  }

  async forYou(viewerId: string) {
    type ForYouPayload = {
      rails: {
        kind: DiscoverRailKind;
        people: Awaited<ReturnType<DiscoverService['toPersonCard']>>[];
      }[];
      goalPattern: Awaited<
        ReturnType<TopicDiscoverService['goalPatternForViewer']>
      >;
      yourTopics: {
        name: string;
        normalizedName: string;
        listCount: number;
      }[];
      starterLists: {
        handle: string;
        name: string;
        total: number;
        topicId: string;
        isStarter: true;
      }[];
    };

    const cacheKey = `for-you:${viewerId}:${getDiscoverVersion()}`;
    const cached = discoverCacheGet<ForYouPayload>(cacheKey);
    if (cached) return cached;

    const { viewer, candidates } = await this.loadContext(viewerId);

    const rawRails: { kind: DiscoverRailKind; people: ScoredPerson[] }[] = [
      { kind: 'peers', people: buildRailByKind('peers', viewer, candidates) },
      { kind: 'ahead', people: buildRailByKind('ahead', viewer, candidates) },
      { kind: 'same_goal', people: buildRailByKind('same_goal', viewer, candidates) },
      { kind: 'consistent', people: buildRailByKind('consistent', viewer, candidates) },
      { kind: 'active_week', people: buildRailByKind('active_week', viewer, candidates) },
    ];

    let rails = this.filterRails(rawRails);
    if (viewer.practiceGoal) {
      const sameGoal = rails.find((r) => r.kind === 'same_goal');
      const rest = rails.filter((r) => r.kind !== 'same_goal');
      rails = sameGoal ? [sameGoal, ...rest] : rest;
    }

    const railsOut = await Promise.all(
      rails.map(async (r) => ({
        kind: r.kind,
        people: await Promise.all(r.people.map((p) => this.toPersonCard(p))),
      })),
    );

    const [yourTopics, starterLists, goalPattern] = await Promise.all([
      this.loadYourTopics(viewer),
      this.loadStarterLists(),
      this.topicDiscover.goalPatternForViewer(viewerId),
    ]);

    const payload: ForYouPayload = {
      rails: railsOut,
      goalPattern,
      yourTopics,
      starterLists,
    };
    discoverCacheSet(cacheKey, payload, DISCOVER_CACHE_TTL_MS);
    return payload;
  }

  private async loadYourTopics(viewer: DiscoverPersonSnapshot) {
    const names = viewer.topicStats.map((t) => t.normalizedName);
    if (names.length === 0) return [];
    const rows = await this.db
      .select({
        normalizedName: topics.normalizedName,
        name: topics.name,
        listCount: count(),
      })
      .from(topics)
      .where(and(eq(topics.isPublic, true), inArray(topics.normalizedName, names)))
      .groupBy(topics.normalizedName, topics.name);

    return viewer.topicStats.map((t) => {
      const row = rows.find((r) => r.normalizedName === t.normalizedName);
      return {
        name: row?.name ?? t.normalizedName,
        normalizedName: t.normalizedName,
        listCount: Number(row?.listCount ?? 0),
      };
    });
  }

  private async loadStarterLists() {
    const starter = await this.subjects.findByHandle(STARTER_HANDLE);
    if (!starter) return [];
    const board = await this.db
      .select({
        id: topics.id,
        name: topics.name,
        total: count(problems.id),
      })
      .from(topics)
      .leftJoin(problemTopics, eq(problemTopics.topicId, topics.id))
      .leftJoin(
        problems,
        and(
          eq(problemTopics.problemId, problems.id),
          eq(problems.userId, starter.userId),
        ),
      )
      .where(and(eq(topics.userId, starter.userId), eq(topics.isPublic, true)))
      .groupBy(topics.id, topics.name)
      .orderBy(topics.name);

    return board.map((row) => ({
      handle: STARTER_HANDLE,
      name: row.name,
      total: Number(row.total),
      topicId: row.id,
      isStarter: true as const,
    }));
  }

  async listPeople(viewerId: string, query: PeopleListQuery) {
    const { viewer, candidates } = await this.loadContext(viewerId);
    let scored: ScoredPerson[] = [];
    if (query.rail === 'following') {
      const blocked = await this.blockedIds(viewerId);
      const blockedSet = new Set(blocked);
      scored = (await this.follows.listFollowingRail(viewerId)).filter(
        (s) => !blockedSet.has(s.person.userId),
      );
    } else if (query.rail) {
      scored = buildRailByKind(query.rail, viewer, candidates);
    } else {
      scored = buildRailByKind('peers', viewer, candidates);
    }

    if (query.goal) {
      scored = scored.filter((s) => s.person.practiceGoal === query.goal);
    }
    if (query.platform) {
      scored = scored.filter((s) =>
        s.person.platforms.some((p) => p.slug === query.platform),
      );
    }
    if (query.topic) {
      const topic = query.topic.toLowerCase();
      scored = scored.filter(
        (s) =>
          s.person.visibility === 'topics' &&
          s.person.topicNames.includes(topic),
      );
    }
    if (query.active) {
      scored = scored.filter((s) => s.person.solvesThisWeek >= 1);
    }

    const total = scored.length;
    const start = (query.page - 1) * PEOPLE_PAGE_SIZE;
    const pageItems = scored.slice(start, start + PEOPLE_PAGE_SIZE);
    const items = await Promise.all(pageItems.map((p) => this.toPersonCard(p)));
    return {
      items,
      meta: {
        total,
        page: query.page,
        pageSize: PEOPLE_PAGE_SIZE,
      },
    };
  }

  async similar(
    handle: string,
    viewerId: string,
    query: SimilarQuery,
  ) {
    const subjectRow = assertViewable(
      await this.subjects.findByHandle(handle),
      'summary',
    );
    const subject = await this.repository.loadPersonSnapshot(subjectRow.userId);
    if (!subject) throw profileNotFound();
    await this.safety.assertNotBlocked(viewerId, subjectRow.userId);
    const blocked = await this.blockedIds(viewerId);
    const candidates = await this.repository.loadEligibleCandidates(
      viewerId,
      blocked,
    );
    const scored = buildSimilarPeople(subject, candidates, query.limit);
    const items = await Promise.all(scored.map((p) => this.toPersonCard(p)));
    return { items };
  }

  async recordEvents(viewerId: string, body: DiscoverEventsBody) {
    const allowed = new Set<string>(DISCOVER_EVENT_NAMES);
    for (const item of body.events) {
      if (!allowed.has(item.event)) {
        throw new BadRequestException({
          code: 'INVALID_EVENT',
          message: 'Unknown discover event.',
        });
      }
    }
    if (body.events.length === 0) return { accepted: 0 };
    await this.db.insert(discoverEvents).values(
      body.events.map((e) => ({
        viewerId,
        event: e.event,
        surface: e.surface,
      })),
    );
    return { accepted: body.events.length };
  }
}