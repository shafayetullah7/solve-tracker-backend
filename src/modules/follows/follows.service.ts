import { BadRequestException, Injectable } from '@nestjs/common';
import { practiceGoalSchema } from '../../common/schemas/practice-discovery.schema.js';
import { PEOPLE_PAGE_SIZE } from '../discover/discover.config.js';
import { DiscoverRepository } from '../discover/discover.repository.js';
import { DiscoverSubjectRepository } from '../discover/discover-subject.repository.js';
import { profileNotFound } from '../discover/discover.errors.js';
import { formatDiscoverReason } from '../discover/discover-reason-text.js';
import { MediaService } from '../media/media.service.js';
import type { ScoredPerson } from '../discover/rails.js';
import { assertViewable } from '../discover/visibility.js';
import { FollowsRepository } from './follows.repository.js';
import type { FollowingListQuery } from './schemas/follows.schema.js';

const STARTER_HANDLE = 'starter';

function isSummaryViewable(
  visibility: string,
): visibility is 'summary' | 'topics' {
  return visibility === 'summary' || visibility === 'topics';
}

@Injectable()
export class FollowsService {
  constructor(
    private readonly follows: FollowsRepository,
    private readonly subjects: DiscoverSubjectRepository,
    private readonly discover: DiscoverRepository,
    private readonly media: MediaService,
  ) {}

  async follow(followerId: string, handle: string): Promise<void> {
    if (handle.toLowerCase() === STARTER_HANDLE) {
      throw profileNotFound();
    }
    const subject = assertViewable(
      await this.subjects.findByHandle(handle),
      'summary',
    );
    if (subject.userId === followerId) {
      throw new BadRequestException({
        code: 'CANNOT_FOLLOW_SELF',
        message: 'You cannot follow yourself.',
      });
    }
    await this.follows.insertFollow(followerId, subject.userId);
  }

  async unfollow(followerId: string, handle: string): Promise<void> {
    const subject = await this.subjects.findByHandle(handle);
    if (!subject) return;
    await this.follows.deleteFollow(followerId, subject.userId);
  }

  async viewerFollows(
    followerId: string,
    followeeId: string,
  ): Promise<boolean> {
    if (followerId === followeeId) return false;
    return this.follows.isFollowing(followerId, followeeId);
  }

  async followersCount(userId: string): Promise<{ count: number }> {
    const count = await this.follows.countFollowers(userId);
    return { count };
  }

  private async toPersonCard(scored: ScoredPerson) {
    const p = scored.person;
    const goal =
      p.practiceGoal === null
        ? null
        : practiceGoalSchema.parse(p.practiceGoal);
    let avatarUrl: string | undefined;
    if (p.avatarMediaId) {
      const row = await this.media.findOwnedRecord(p.userId, p.avatarMediaId);
      if (row) {
        avatarUrl = this.media.deliveryUrl(row.publicId, row.extension);
      }
    }
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

  async listFollowing(viewerId: string, query: FollowingListQuery) {
    const start = (query.page - 1) * PEOPLE_PAGE_SIZE;
    const { ids, total } = await this.follows.listFolloweeIds(
      viewerId,
      PEOPLE_PAGE_SIZE,
      start,
    );
    const snapshots = await this.discover.loadPersonSnapshots(ids);
    const byId = new Map(snapshots.map((s) => [s.userId, s]));
    const viewable: ScoredPerson[] = [];
    for (const id of ids) {
      const person = byId.get(id);
      if (!person || !isSummaryViewable(person.visibility)) continue;
      viewable.push({
        person,
        score: 0,
        reason: { kind: 'following', values: {} },
      });
    }
    viewable.sort((a, b) => a.person.handle.localeCompare(b.person.handle));
    const items = await Promise.all(viewable.map((p) => this.toPersonCard(p)));
    return {
      items,
      meta: {
        total,
        page: query.page,
        pageSize: PEOPLE_PAGE_SIZE,
      },
    };
  }

  async listFollowingRail(viewerId: string): Promise<ScoredPerson[]> {
    const { ids } = await this.follows.listFolloweeIds(
      viewerId,
      10_000,
      0,
    );
    if (ids.length === 0) return [];
    const snapshots = await this.discover.loadPersonSnapshots(ids);
    const byId = new Map(snapshots.map((s) => [s.userId, s]));
    const scored: ScoredPerson[] = [];
    for (const id of ids) {
      const person = byId.get(id);
      if (!person || !isSummaryViewable(person.visibility)) continue;
      scored.push({
        person,
        score: 0,
        reason: { kind: 'following', values: {} },
      });
    }
    scored.sort((a, b) => a.person.handle.localeCompare(b.person.handle));
    return scored;
  }
}