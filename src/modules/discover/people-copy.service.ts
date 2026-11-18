import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import { problemTopics, problems, topics } from '../../database/schema/index.js';
import { ProblemsRepository } from '../problems/problems.repository.js';
import { TopicsRepository } from '../topics/topics.repository.js';
import { DiscoverCountersService } from './discover-counters.service.js';
import { profileNotFound } from './discover.errors.js';
import { DiscoverSubjectRepository } from './discover-subject.repository.js';
import { PeopleRepository } from './people.repository.js';
@Injectable()
export class PeopleCopyService {
  constructor(
    private readonly database: DatabaseService,
    private readonly subjects: DiscoverSubjectRepository,
    private readonly people: PeopleRepository,
    private readonly problems: ProblemsRepository,
    private readonly topics: TopicsRepository,
    private readonly counters: DiscoverCountersService,
  ) {}

  private get db() {
    return this.database.db;
  }

  async copyPublicTopic(
    handle: string,
    sourceTopicId: string,
    viewerId: string,
  ): Promise<{ topicId: string; topicName: string; added: number; linked: number }> {
    const subject = await this.subjects.findByHandle(handle);
    if (!subject || subject.visibility !== 'topics') throw profileNotFound();

    const source = await this.people.findPublicTopic(subject.userId, sourceTopicId);
    if (!source) throw profileNotFound();

    const { items } = await this.people.listPublicTopicProblems({
      subjectUserId: subject.userId,
      topicId: sourceTopicId,
      page: 1,
      pageSize: 500,
    });

    let viewerTopic = await this.db
      .select()
      .from(topics)
      .where(
        and(
          eq(topics.userId, viewerId),
          eq(topics.normalizedName, source.normalizedName),
        ),
      )
      .limit(1);

    let targetTopicId: string;
    if (viewerTopic[0]) {
      targetTopicId = viewerTopic[0].id;
    } else {
      const created = await this.topics.insert(
        viewerId,
        source.name,
        source.normalizedName,
      );
      targetTopicId = created.id;
    }

    let added = 0;
    let linked = 0;

    for (const item of items) {
      const existingId = await this.problems.findIdByNormalizedUrl(
        viewerId,
        item.normalizedUrl,
      );
      if (existingId) {
        const alreadyLinked = await this.db
          .select({ topicId: problemTopics.topicId })
          .from(problemTopics)
          .where(
            and(
              eq(problemTopics.problemId, existingId),
              eq(problemTopics.topicId, targetTopicId),
            ),
          )
          .limit(1);
        if (alreadyLinked.length === 0) {
          await this.db.insert(problemTopics).values({
            problemId: existingId,
            topicId: targetTopicId,
          });
        }
        linked += 1;
        continue;
      }

      await this.problems.createWithTopics(
        viewerId,
        {
          title: item.title,
          url: item.url,
          normalizedUrl: item.normalizedUrl,
          platformSlug: item.platformSlug,
          platformProblemId: item.platformProblemId,
          difficulty: item.difficulty,
          rating: item.rating,
          notes: null,
          status: 'unsolved',
          solvedAt: null,
        },
        [targetTopicId],
      );
      added += 1;
    }

    await this.counters.recordTopicCopy(viewerId, subject.userId, sourceTopicId);

    return {
      topicId: targetTopicId,
      topicName: source.name,
      added,
      linked,
    };
  }
}