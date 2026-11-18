import { Injectable } from '@nestjs/common';
import { practiceGoalSchema } from '../../common/schemas/practice-discovery.schema.js';
import { percentComplete } from '../progress/progress-percent.js';
import { ProgressService } from '../progress/progress.service.js';
import { MediaService } from '../media/media.service.js';
import { profileNotFound } from './discover.errors.js';
import { DiscoverCountersService } from './discover-counters.service.js';
import { DiscoverService } from './discover.service.js';
import { TopicDiscoverService } from './topic-discover.service.js';
import type { SimilarQuery } from './schemas/discover.schema.js';
import { buildDifficultyHistogram } from './difficulty-histogram.js';
import { DiscoverSubjectRepository } from './discover-subject.repository.js';
import { PeopleRepository } from './people.repository.js';
import { FollowsService } from '../follows/follows.service.js';
import type { ListPeopleProblemsQuery } from './schemas/people.schema.js';
import { DiscoverSafetyService } from '../discover-safety/discover-safety.service.js';
import {
  assertPublicWebViewable,
  assertViewable,
  toPersonHeader,
  toPublicProblemRow,
  toTopicBoardRow,
} from './visibility.js';

function practicingSinceLabel(createdAt: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(createdAt);
}

function toCounts(total: number, solved: number) {
  const safeTotal = Math.max(0, total);
  const safeSolved = Math.min(Math.max(0, solved), safeTotal);
  return {
    total: safeTotal,
    solved: safeSolved,
    unsolved: safeTotal - safeSolved,
  };
}

@Injectable()
export class PeopleService {
  constructor(
    private readonly subjects: DiscoverSubjectRepository,
    private readonly people: PeopleRepository,
    private readonly progress: ProgressService,
    private readonly media: MediaService,
    private readonly counters: DiscoverCountersService,
    private readonly discover: DiscoverService,
    private readonly topicDiscover: TopicDiscoverService,
    private readonly follows: FollowsService,
    private readonly safety: DiscoverSafetyService,
  ) {}

  private async resolveSubject(handle: string) {
    return this.subjects.findByHandle(handle);
  }

  private async resolveAvatarUrl(
    userId: string,
    avatarMediaId: string | null,
  ): Promise<string | undefined> {
    if (!avatarMediaId) return undefined;
    const row = await this.media.findOwnedRecord(userId, avatarMediaId);
    if (!row) return undefined;
    return this.media.deliveryUrl(row.publicId, row.extension);
  }

  async getProfile(handle: string, viewerId: string) {
    const subject = assertViewable(await this.resolveSubject(handle), 'summary');
    await this.safety.assertNotBlocked(viewerId, subject.userId);
    const [summaries, activity, avatarUrl] = await Promise.all([
      this.progress.getSummaries(subject.userId),
      this.progress.getActivity(subject.userId, 12),
      this.resolveAvatarUrl(subject.userId, subject.avatarMediaId),
    ]);
    await this.counters.recordProfileView(viewerId, subject.userId);
    const goal =
      subject.practiceGoal === null
        ? null
        : practiceGoalSchema.parse(subject.practiceGoal);
    const viewerFollows =
      viewerId !== subject.userId
        ? await this.follows.viewerFollows(viewerId, subject.userId)
        : undefined;
    return toPersonHeader({
      handle: subject.handle,
      name: subject.name,
      bio: subject.bio,
      ...(avatarUrl ? { avatarUrl } : {}),
      practiceGoal: goal,
      overall: summaries.overall,
      streak: activity.streak,
      platforms: summaries.platforms,
      practicingSince: practicingSinceLabel(subject.createdAt),
      ...(viewerFollows === undefined ? {} : { viewerFollows }),
    });
  }

  async getActivity(handle: string, weeks: number) {
    const subject = assertViewable(await this.resolveSubject(handle), 'summary');
    return this.progress.getActivity(subject.userId, weeks);
  }

  async getTopics(handle: string) {
    const subject = assertViewable(await this.resolveSubject(handle), 'topics');
    const rows = await this.people.loadTopicBoard(subject.userId);
    return {
      items: rows.map((row) =>
        toTopicBoardRow({
          name: row.name,
          total: row.total,
          solved: row.solved,
          unsolved: row.total - row.solved,
          percentComplete: percentComplete(row.solved, row.total),
          isPublic: row.isPublic,
          ...(row.isPublic ? { id: row.id } : {}),
        }),
      ),
    };
  }

  async getPublicTopic(handle: string, topicId: string, viewerId: string) {
    const subject = assertViewable(
      await this.resolveSubject(handle),
      'publicTopic',
    );
    const topic = await this.people.findPublicTopic(subject.userId, topicId);
    if (!topic) throw profileNotFound();
    const [histogramRows, copies30d, moreLists] = await Promise.all([
      this.people.loadTopicProblemHistogram(subject.userId, topicId),
      this.counters.sumMetricLastDays('topic', topicId, 30, 'copies'),
      this.topicDiscover.moreListsForPublicTopic(
        topic.normalizedName,
        subject.userId,
        3,
      ),
    ]);
    await this.counters.recordTopicView(viewerId, subject.userId, topicId);
    const counts = toCounts(topic.total, topic.solved);
    return {
      name: topic.name,
      description: topic.description,
      ownerCompletion: {
        ...counts,
        percentComplete: percentComplete(counts.solved, counts.total),
      },
      copies30d,
      difficultyHistogram: buildDifficultyHistogram(histogramRows),
      moreLists,
    };
  }

  async getPublicTopicProblems(
    handle: string,
    topicId: string,
    viewerId: string,
    query: ListPeopleProblemsQuery,
  ) {
    const subject = assertViewable(
      await this.resolveSubject(handle),
      'publicTopic',
    );
    const topic = await this.people.findPublicTopic(subject.userId, topicId);
    if (!topic) throw profileNotFound();

    const { items, total } = await this.people.listPublicTopicProblems({
      subjectUserId: subject.userId,
      topicId,
      page: query.page,
      pageSize: query.pageSize,
      status: query.status,
      platformSlug: query.platform,
    });

    const library = await this.people.viewerNormalizedUrls(
      viewerId,
      items.map((row) => row.normalizedUrl),
    );

    return {
      items: items.map((row) =>
        toPublicProblemRow({
          title: row.title,
          url: row.url,
          platformSlug: row.platformSlug,
          platformProblemId: row.platformProblemId,
          difficulty: row.difficulty,
          rating: row.rating,
          ownerStatus: row.status,
          inViewerLibrary: library.has(row.normalizedUrl),
        }),
      ),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
      },
    };
  }

  getSimilar(handle: string, viewerId: string, query: SimilarQuery) {
    return this.discover.similar(handle, viewerId, query);
  }

  async getPublicProfile(handle: string) {
    const subject = assertPublicWebViewable(
      await this.resolveSubject(handle),
      'summary',
    );
    const [summaries, activity, avatarUrl] = await Promise.all([
      this.progress.getSummaries(subject.userId),
      this.progress.getActivity(subject.userId, 12),
      this.resolveAvatarUrl(subject.userId, subject.avatarMediaId),
    ]);
    const goal =
      subject.practiceGoal === null
        ? null
        : practiceGoalSchema.parse(subject.practiceGoal);
    return toPersonHeader({
      handle: subject.handle,
      name: subject.name,
      bio: subject.bio,
      ...(avatarUrl ? { avatarUrl } : {}),
      practiceGoal: goal,
      overall: summaries.overall,
      streak: activity.streak,
      platforms: summaries.platforms,
      practicingSince: practicingSinceLabel(subject.createdAt),
    });
  }

  async getPublicActivity(handle: string, weeks: number) {
    const subject = assertPublicWebViewable(
      await this.resolveSubject(handle),
      'summary',
    );
    return this.progress.getActivity(subject.userId, weeks);
  }

  async getPublicTopics(handle: string) {
    const subject = assertPublicWebViewable(
      await this.resolveSubject(handle),
      'topics',
    );
    const rows = await this.people.loadTopicBoard(subject.userId);
    return {
      items: rows
        .filter((row) => row.isPublic)
        .map((row) =>
          toTopicBoardRow({
            name: row.name,
            total: row.total,
            solved: row.solved,
            unsolved: row.total - row.solved,
            percentComplete: percentComplete(row.solved, row.total),
            isPublic: true,
            id: row.id,
          }),
        ),
    };
  }

  async getPublicTopicHeader(handle: string, topicId: string) {
    const subject = assertPublicWebViewable(
      await this.resolveSubject(handle),
      'publicTopic',
    );
    const topic = await this.people.findPublicTopic(subject.userId, topicId);
    if (!topic) throw profileNotFound();
    const [histogramRows, copies30d, moreLists] = await Promise.all([
      this.people.loadTopicProblemHistogram(subject.userId, topicId),
      this.counters.sumMetricLastDays('topic', topicId, 30, 'copies'),
      this.topicDiscover.moreListsForPublicTopic(
        topic.normalizedName,
        subject.userId,
        3,
      ),
    ]);
    const counts = toCounts(topic.total, topic.solved);
    return {
      name: topic.name,
      description: topic.description,
      ownerCompletion: {
        ...counts,
        percentComplete: percentComplete(counts.solved, counts.total),
      },
      copies30d,
      difficultyHistogram: buildDifficultyHistogram(histogramRows),
      moreLists,
    };
  }

  async getPublicWebTopicProblems(
    handle: string,
    topicId: string,
    query: ListPeopleProblemsQuery,
  ) {
    const subject = assertPublicWebViewable(
      await this.resolveSubject(handle),
      'publicTopic',
    );
    const topic = await this.people.findPublicTopic(subject.userId, topicId);
    if (!topic) throw profileNotFound();
    const { items, total } = await this.people.listPublicTopicProblems({
      subjectUserId: subject.userId,
      topicId,
      page: query.page,
      pageSize: query.pageSize,
      status: query.status,
      platformSlug: query.platform,
    });
    return {
      items: items.map((row) =>
        toPublicProblemRow({
          title: row.title,
          url: row.url,
          platformSlug: row.platformSlug,
          platformProblemId: row.platformProblemId,
          difficulty: row.difficulty,
          rating: row.rating,
          ownerStatus: row.status,
        }),
      ),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
      },
    };
  }
}