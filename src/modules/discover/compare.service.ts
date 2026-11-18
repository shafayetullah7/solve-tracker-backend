import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import { topics } from '../../database/schema/index.js';
import { ProgressService } from '../progress/progress.service.js';
import {
  buildCompareSide,
  buildTopicCompareRows,
  medianSides,
} from './compare.js';
import {
  COMPARE_WEEKS_DEFAULT,
  MIN_PEERS_BENCHMARK,
  PEER_COMPARE_POOL,
} from './discover.config.js';
import { profileNotFound } from './discover.errors.js';
import { DiscoverRepository } from './discover.repository.js';
import { DiscoverSubjectRepository } from './discover-subject.repository.js';
import { buildCompareInsights, firstInsight } from './insights.js';
import { buildRailByKind } from './rails.js';
import { assertViewable } from './visibility.js';
import type { CompareQuery } from './schemas/compare.schema.js';
import { PeopleRepository } from './people.repository.js';

@Injectable()
export class CompareService {
  constructor(
    private readonly database: DatabaseService,
    private readonly progress: ProgressService,
    private readonly subjects: DiscoverSubjectRepository,
    private readonly repository: DiscoverRepository,
    private readonly people: PeopleRepository,
  ) {}

  private get db() {
    return this.database.db;
  }

  private async normalizedNameMap(userId: string): Promise<Map<string, string>> {
    const rows = await this.db
      .select({ id: topics.id, normalizedName: topics.normalizedName })
      .from(topics)
      .where(eq(topics.userId, userId));
    return new Map(rows.map((r) => [r.id, r.normalizedName]));
  }

  private async viewerTopicNames(viewerId: string): Promise<Set<string>> {
    const rows = await this.db
      .select({ normalizedName: topics.normalizedName })
      .from(topics)
      .where(eq(topics.userId, viewerId));
    return new Set(rows.map((r) => r.normalizedName));
  }

  async sideForUser(userId: string, weeks: number) {
    const [summaries, activity, normMap] = await Promise.all([
      this.progress.getSummaries(userId),
      this.progress.getActivity(userId, weeks),
      this.normalizedNameMap(userId),
    ]);
    return buildCompareSide(summaries, activity, normMap);
  }

  private async peerUserIds(viewerId: string): Promise<string[]> {
    const viewer = await this.repository.loadPersonSnapshot(viewerId);
    if (!viewer) return [];
    const candidates = await this.repository.loadEligibleCandidates(viewerId);
    const scored = buildRailByKind('peers', viewer, candidates);
    return scored.slice(0, PEER_COMPARE_POOL).map((s) => s.person.userId);
  }

  async compareWithPerson(
    handle: string,
    viewerId: string,
    query: CompareQuery,
  ) {
    const subjectRow = assertViewable(
      await this.subjects.findByHandle(handle),
      'summary',
    );
    const weeks = query.weeks ?? COMPARE_WEEKS_DEFAULT;
    const [me, them, viewerTopics, subjectPublic] = await Promise.all([
      this.sideForUser(viewerId, weeks),
      this.sideForUser(subjectRow.userId, weeks),
      this.viewerTopicNames(viewerId),
      subjectRow.visibility === 'topics'
        ? this.loadSubjectPublicTopics(subjectRow.userId)
        : Promise.resolve([]),
    ]);

    const topicRows =
      subjectRow.visibility === 'topics'
        ? buildTopicCompareRows(me, them)
        : [];

    const insights = buildCompareInsights(me, them, topicRows, {
      subjectHandle: subjectRow.handle,
      weeks,
      subjectTopicsVisible: subjectRow.visibility === 'topics',
      subjectPublicTopics: subjectPublic,
      viewerTopicNames: viewerTopics,
    });

    return {
      weeks,
      mode: 'person' as const,
      handle: subjectRow.handle,
      summaryOnlyTopics: subjectRow.visibility !== 'topics',
      me,
      them,
      topics: topicRows,
      insights,
    };
  }

  private async loadSubjectPublicTopics(subjectUserId: string) {
    const board = await this.people.loadTopicBoard(subjectUserId);
    return board
      .filter((t) => t.isPublic)
      .map((t) => ({
        topicId: t.id,
        name: t.name,
        normalizedName: t.normalizedName,
      }));
  }

  async compareWithPeers(viewerId: string, query: CompareQuery) {
    const weeks = query.weeks ?? COMPARE_WEEKS_DEFAULT;
    const peerIds = await this.peerUserIds(viewerId);
    const me = await this.sideForUser(viewerId, weeks);

    if (peerIds.length < MIN_PEERS_BENCHMARK) {
      throw profileNotFound();
    }

    const sides = await Promise.all(peerIds.map((id) => this.sideForUser(id, weeks)));
    const them = medianSides(sides);

    const insights = buildCompareInsights(me, them, buildTopicCompareRows(me, them), {
      subjectHandle: 'peers',
      weeks,
      subjectTopicsVisible: true,
      subjectPublicTopics: [],
      viewerTopicNames: await this.viewerTopicNames(viewerId),
    });

    return {
      weeks,
      mode: 'peers' as const,
      summaryOnlyTopics: false,
      me,
      them,
      topics: buildTopicCompareRows(me, them),
      insights,
      peerCount: peerIds.length,
    };
  }

  async benchmark(viewerId: string) {
    const weeks = COMPARE_WEEKS_DEFAULT;
    const peerIds = await this.peerUserIds(viewerId);
    const me = await this.sideForUser(viewerId, weeks);

    if (peerIds.length < MIN_PEERS_BENCHMARK) {
      return { peerCount: peerIds.length, me, peers: null, insight: null };
    }

    const sides = await Promise.all(peerIds.map((id) => this.sideForUser(id, weeks)));
    const peers = medianSides(sides);
    const insights = buildCompareInsights(me, peers, buildTopicCompareRows(me, peers), {
      subjectHandle: 'peers',
      weeks,
      subjectTopicsVisible: true,
      subjectPublicTopics: [],
      viewerTopicNames: await this.viewerTopicNames(viewerId),
    });

    return {
      peerCount: peerIds.length,
      me,
      peers,
      insight: firstInsight(insights),
    };
  }
}