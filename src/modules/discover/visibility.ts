import { and, eq, sql } from 'drizzle-orm';
import { topics, users } from '../../database/schema/index.js';
import type { PracticeVisibility } from '../../common/schemas/practice-discovery.schema.js';
import { profileNotFound } from './discover.errors.js';
import type { DiscoverSubjectRow } from './discover-subject.repository.js';

export type ViewLevel = 'summary' | 'topics' | 'publicTopic';

const PERSON_HEADER_KEYS = new Set([
  'handle',
  'name',
  'bio',
  'avatarUrl',
  'practiceGoal',
  'overall',
  'streak',
  'platforms',
  'practicingSince',
  'viewerFollows',
]);

const TOPIC_BOARD_KEYS = new Set([
  'name',
  'total',
  'solved',
  'unsolved',
  'percentComplete',
  'isPublic',
  'id',
]);

const PUBLIC_PROBLEM_KEYS = new Set([
  'title',
  'url',
  'platformSlug',
  'platformProblemId',
  'difficulty',
  'rating',
  'ownerStatus',
  'inViewerLibrary',
]);

export function assertPublicWebViewable(
  subject: DiscoverSubjectRow | undefined,
  level: ViewLevel,
): DiscoverSubjectRow {
  if (!subject || !subject.publicWeb || subject.visibility === 'private') {
    throw profileNotFound();
  }
  return assertViewable(subject, level);
}

export function assertViewable(
  subject: DiscoverSubjectRow | undefined,
  level: ViewLevel,
): DiscoverSubjectRow {
  if (!subject || subject.visibility === 'private') {
    throw profileNotFound();
  }
  if (level === 'summary') {
    if (subject.visibility === 'summary' || subject.visibility === 'topics') {
      return subject;
    }
    throw profileNotFound();
  }
  if (level === 'topics') {
    if (subject.visibility === 'topics') return subject;
    throw profileNotFound();
  }
  if (level === 'publicTopic') {
    if (subject.visibility === 'topics') return subject;
    throw profileNotFound();
  }
  throw profileNotFound();
}

export function publicTopicFilter(subjectUserId: string, topicId: string) {
  return and(
    eq(topics.id, topicId),
    eq(topics.userId, subjectUserId),
    eq(topics.isPublic, true),
    sql`exists (
      select 1 from ${users} u
      where u.id = ${subjectUserId}
        and u.practice_visibility = 'topics'
    )`,
  );
}

export const publicTopicCondition = publicTopicFilter;

/** Eligible public list: flag + owner visibility topics (for discover aggregates). */
export function eligiblePublicTopicConditions() {
  return and(
    eq(topics.isPublic, true),
    sql`exists (
      select 1 from ${users} u
      where u.id = ${topics.userId}
        and u.practice_visibility = 'topics'
    )`,
  );
}

export type PersonHeaderDto = {
  handle: string;
  name: string;
  bio: string;
  avatarUrl?: string;
  practiceGoal: string | null;
  overall: { total: number; solved: number; unsolved: number };
  streak: { currentDays: number; lastSolveDate: string | null };
  platforms: Array<{
    slug: string;
    name: string;
    total: number;
    solved: number;
    unsolved: number;
  }>;
  practicingSince: string;
  viewerFollows?: boolean;
};

export function toPersonHeader(
  input: PersonHeaderDto,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...input };
  for (const key of Object.keys(out)) {
    if (!PERSON_HEADER_KEYS.has(key)) delete out[key];
  }
  return out as PersonHeaderDto;
}

export type TopicBoardRowDto = {
  name: string;
  total: number;
  solved: number;
  unsolved: number;
  percentComplete: number;
  isPublic: boolean;
  id?: string;
};

export function toTopicBoardRow(
  input: TopicBoardRowDto,
): Record<string, unknown> {
  const row: TopicBoardRowDto = {
    name: input.name,
    total: input.total,
    solved: input.solved,
    unsolved: input.unsolved,
    percentComplete: input.percentComplete,
    isPublic: input.isPublic,
    ...(input.isPublic && input.id ? { id: input.id } : {}),
  };
  const out = { ...row } as Record<string, unknown>;
  for (const key of Object.keys(out)) {
    if (!TOPIC_BOARD_KEYS.has(key)) delete out[key];
  }
  if (!row.isPublic) delete out.id;
  return out;
}

export type PublicProblemRowDto = {
  title: string;
  url: string;
  platformSlug: string;
  platformProblemId: string | null;
  difficulty: string | null;
  rating: number | null;
  ownerStatus: 'solved' | 'unsolved';
  inViewerLibrary?: boolean;
};

export function toPublicProblemRow(
  input: PublicProblemRowDto,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...input };
  for (const key of Object.keys(out)) {
    if (!PUBLIC_PROBLEM_KEYS.has(key)) delete out[key];
  }
  return out;
}

export function isSummaryVisible(visibility: PracticeVisibility): boolean {
  return visibility === 'summary' || visibility === 'topics';
}