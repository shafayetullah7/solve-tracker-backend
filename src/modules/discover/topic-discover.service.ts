import { Injectable } from '@nestjs/common';
import { practiceGoalSchema } from '../../common/schemas/practice-discovery.schema.js';
import {
  DISCOVER_CACHE_TTL_MS,
  HUB_LIST_PAGE_TOP,
  HUB_LIST_RANK_TOP,
  MIN_TOPIC_HINT,
  MIN_USERS_PATTERN,
  RAIL_CARD_LIMIT,
  RAIL_MIN_CARDS,
} from './discover.config.js';
import {
  discoverCacheGet,
  discoverCacheSet,
  getDiscoverVersion,
} from './discover-cache.js';
import { profileNotFound } from './discover.errors.js';
import { DiscoverCountersService } from './discover-counters.service.js';
import { DiscoverRepository } from './discover.repository.js';
import { MediaService } from '../media/media.service.js';
import { decodeTopicKey, encodeTopicKey } from './topic-key.js';
import { TopicMaterialRepository } from './topic-material.repository.js';
import {
  publicListScore,
  rankPublicLists,
  topPatternRows,
} from './topic-material.js';
import type {
  HubListsQuery,
  HubProblemsQuery,
} from './schemas/discover.schema.js';

function formatListReason(total: number, solved: number, copies30d: number): string {
  const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
  const copyPart = copies30d > 0 ? ` · copied ${copies30d}× this month` : '';
  return `${total} problems · ${pct}% solved by owner${copyPart}`;
}

function formatSpecialistReason(total: number, solved: number): string {
  const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
  return `${total} problems · ${pct}% solved`;
}

function formatInListsReason(listCount: number): string {
  return `In ${listCount} public lists`;
}

@Injectable()
export class TopicDiscoverService {
  constructor(
    private readonly material: TopicMaterialRepository,
    private readonly repository: DiscoverRepository,
    private readonly counters: DiscoverCountersService,
    private readonly media: MediaService,
  ) {}

  private async avatarUrl(
    userId: string,
    avatarMediaId: string | null,
  ): Promise<string | undefined> {
    if (!avatarMediaId) return undefined;
    const row = await this.media.findOwnedRecord(userId, avatarMediaId);
    if (!row) return undefined;
    return this.media.deliveryUrl(row.publicId, row.extension);
  }

  async topicsDirectory(viewerId: string) {
    const [yourTopics, popularTopics] = await Promise.all([
      this.material.loadDirectoryYour(viewerId),
      this.material.loadDirectoryPopular(),
    ]);
    return { yourTopics, popularTopics };
  }

  private async enrichListRows(rows: ReturnType<typeof rankPublicLists>) {
    return Promise.all(
      rows.map(async (row) => {
        const copies30d = await this.counters.sumMetricLastDays(
          'topic',
          row.topicId,
          30,
          'copies',
        );
        const withCopies = { ...row, copies30d };
        return {
          topicId: row.topicId,
          handle: row.handle,
          name: row.name,
          total: row.total,
          solved: row.solved,
          copies30d,
          reason: {
            kind: 'list_card' as const,
            text: formatListReason(row.total, row.solved, copies30d),
          },
          score: publicListScore(withCopies),
        };
      }),
    );
  }

  async topicHub(viewerId: string, rawTopicKey: string) {
    const normalizedName = decodeTopicKey(rawTopicKey);

    const [
      practicerCount,
      listCount,
      viewerTopic,
      rawLists,
      coRows,
      specialists,
      patternCohort,
    ] = await Promise.all([
      this.material.countPracticers(normalizedName),
      this.material.countPublicLists(normalizedName),
      this.material.findViewerTopic(viewerId, normalizedName),
      this.material.loadPublicListRankRows(normalizedName),
      this.material.loadTopicCoOccurrence(normalizedName),
      this.material.loadSpecialistCandidates(normalizedName),
      this.material.countTopicPatternCohort(normalizedName),
    ]);

    const ranked = rankPublicLists(rawLists, HUB_LIST_PAGE_TOP);
    const lists = await this.enrichListRows(ranked);

    const patternRows = topPatternRows(
      coRows.map((r) => ({
        normalizedName: r.normalizedName,
        name: r.name,
        percent: patternCohort > 0 ? Math.round((r.count / patternCohort) * 100) : 0,
      })),
      5,
      patternCohort,
      MIN_USERS_PATTERN,
    );

    const specialistSnapshots = await this.repository.loadPersonSnapshots(
      specialists.slice(0, RAIL_CARD_LIMIT).map((s) => s.userId),
    );
    const snapshotById = new Map(specialistSnapshots.map((s) => [s.userId, s]));

    const specialistPeople = await Promise.all(
      specialists.slice(0, RAIL_CARD_LIMIT).map(async (s) => {
        const snap = snapshotById.get(s.userId);
        const avatarUrl = await this.avatarUrl(s.userId, s.avatarMediaId);
        const goal =
          snap?.practiceGoal === null || snap?.practiceGoal === undefined
            ? null
            : practiceGoalSchema.parse(snap.practiceGoal);
        const platforms =
          snap?.platforms
            .sort((a, b) => b.total - a.total)
            .slice(0, 3)
            .map((p) => p.slug) ?? [];
        return {
          handle: s.handle,
          name: s.name,
          ...(avatarUrl ? { avatarUrl } : {}),
          practiceGoal: goal,
          solved: snap?.solved ?? s.solved,
          streakDays: snap?.streakDays ?? 0,
          platforms,
          reason: {
            kind: 'topic_specialist' as const,
            text: formatSpecialistReason(s.total, s.solved),
          },
        };
      }),
    );

    const specialistsRail =
      specialistPeople.length >= RAIL_MIN_CARDS
        ? { kind: 'topic_specialists' as const, people: specialistPeople }
        : null;

    const displayName =
      lists[0]?.name ??
      viewerTopic?.name ??
      normalizedName;

    return {
      topicKey: encodeTopicKey(normalizedName),
      name: displayName,
      normalizedName,
      header: {
        practicerCount,
        publicListCount: listCount,
      },
      viewerTopic: viewerTopic
        ? {
            topicId: viewerTopic.id,
            isPublic: viewerTopic.isPublic,
            hasTopic: true,
          }
        : { hasTopic: false as const },
      lists,
      pattern:
        patternRows.length > 0
          ? { items: patternRows }
          : null,
      specialists: specialistsRail,
    };
  }

  async hubLists(viewerId: string, rawTopicKey: string, query: HubListsQuery) {
    const normalizedName = decodeTopicKey(rawTopicKey);
    const rawLists = await this.material.loadPublicListRankRows(normalizedName);
    const ranked = rankPublicLists(rawLists, HUB_LIST_RANK_TOP);
    const start = (query.page - 1) * HUB_LIST_PAGE_TOP;
    const slice = ranked.slice(start, start + HUB_LIST_PAGE_TOP);
    const items = await this.enrichListRows(slice);
    return {
      items,
      meta: {
        page: query.page,
        pageSize: HUB_LIST_PAGE_TOP,
        total: ranked.length,
      },
    };
  }

  async hubProblems(
    viewerId: string,
    rawTopicKey: string,
    query: HubProblemsQuery,
  ) {
    const normalizedName = decodeTopicKey(rawTopicKey);
    const rows = await this.material.loadCommonlyTracked(
      normalizedName,
      viewerId,
      query.excludeMine,
    );
    return {
      items: rows.slice(0, 10).map((r) => ({
        title: r.title,
        platformSlug: r.platformSlug,
        difficulty: r.difficulty,
        listCount: r.listCount,
        normalizedUrl: r.normalizedUrl,
        reason: {
          kind: 'in_n_lists' as const,
          text: formatInListsReason(r.listCount),
        },
      })),
    };
  }

  async topicHints(viewerId: string) {
    const hints = await this.material.loadTopicHints(viewerId);
    return {
      items: hints
        .filter(
          (h) =>
            h.practicerCount >= MIN_TOPIC_HINT ||
            h.publicListCount >= MIN_TOPIC_HINT,
        )
        .map((h) => ({
          topicId: h.topicId,
          topicName: h.topicName,
          topicKey: encodeTopicKey(h.normalizedName),
          practicerCount: h.practicerCount,
          publicListCount: h.publicListCount,
        })),
    };
  }

  async problemCommunity(viewerId: string, problemId: string) {
    const problem = await this.material.findViewerOwnedProblem(viewerId, problemId);
    if (!problem) throw profileNotFound();
    const listCount = await this.material.countCommunityLists(problem.normalizedUrl);
    if (listCount < MIN_TOPIC_HINT) {
      return { listCount, items: [] as { handle: string; topicId: string; name: string }[] };
    }
    return {
      listCount,
      title: problem.title,
      platformSlug: problem.platformSlug,
    };
  }

  async goalPatternForViewer(viewerId: string) {
    const viewer = await this.repository.loadPersonSnapshot(viewerId);
    if (!viewer?.practiceGoal) return null;
    const goal = practiceGoalSchema.parse(viewer.practiceGoal);
    const cohortSize = await this.material.countGoalCohort(goal);
    const rows = await this.material.loadGoalCohortTopicCounts(goal);
    const items = topPatternRows(
      rows.map((r) => ({
        normalizedName: r.normalizedName,
        name: r.name,
        percent: cohortSize > 0 ? Math.round((r.count / cohortSize) * 100) : 0,
      })),
      6,
      cohortSize,
      MIN_USERS_PATTERN,
    );
    if (items.length === 0) return null;
    return { goal, items };
  }

  async moreListsForPublicTopic(
    normalizedName: string,
    excludeOwnerId: string,
    limit = 3,
  ) {
    const rows = await this.material.loadMoreListsPreview(
      normalizedName,
      excludeOwnerId,
      limit,
    );
    return rows.map((r) => ({
      topicId: r.topicId,
      handle: r.handle,
      name: r.name,
      total: Number(r.total),
      solved: Number(r.solved),
    }));
  }
}