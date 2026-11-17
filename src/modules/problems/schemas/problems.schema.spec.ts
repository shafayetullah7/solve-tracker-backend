import { describe, expect, it } from 'vitest';
import {
  createProblemSchema,
  listProblemsQuerySchema,
  problemResponseSchema,
  updateProblemSchema,
} from './problems.schema.js';

describe('problems schemas', () => {
  it('list defaults and topicId', () => {
    expect(listProblemsQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 25,
      sort: 'createdAt',
      order: 'desc',
    });
    expect(
      listProblemsQuerySchema.parse({
        topicId: '11111111-1111-4111-8111-111111111111',
      }).topicId,
    ).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('list coerces topicIds from a single query value', () => {
    expect(
      listProblemsQuerySchema.parse({
        topicIds: '11111111-1111-4111-8111-111111111111',
      }).topicIds,
    ).toEqual(['11111111-1111-4111-8111-111111111111']);
  });

  it('list untagged true', () => {
    expect(listProblemsQuerySchema.parse({ untagged: 'true' }).untagged).toBe(
      true,
    );
  });

  it('list rejects untagged with topicId', () => {
    expect(() =>
      listProblemsQuerySchema.parse({
        untagged: 'true',
        topicId: '11111111-1111-4111-8111-111111111111',
      }),
    ).toThrow();
  });

  it('list accepts seeded platform slugs', () => {
    expect(
      listProblemsQuerySchema.parse({ platform: 'hackerrank' }).platform,
    ).toBe('hackerrank');
  });

  it('list accepts other platform filter', () => {
    expect(listProblemsQuerySchema.parse({ platform: 'other' }).platform).toBe(
      'other',
    );
  });

  it('list rejects invalid platform', () => {
    expect(() =>
      listProblemsQuerySchema.parse({ platform: 'not-a-judge' }),
    ).toThrow();
  });

  it('problem response accepts catalog and other platformSlug', () => {
    const base = {
      id: '11111111-1111-4111-8111-111111111111',
      title: 'T',
      url: 'https://example.com/p',
      platformProblemId: null,
      difficulty: null,
      rating: null,
      notes: null,
      status: 'unsolved' as const,
      solvedAt: null,
      topics: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    expect(
      problemResponseSchema.parse({ ...base, platformSlug: 'leetcode' })
        .platformSlug,
    ).toBe('leetcode');
    expect(
      problemResponseSchema.parse({ ...base, platformSlug: 'other' }).platformSlug,
    ).toBe('other');
  });

  it('create defaults topicIds and status', () => {
    expect(
      createProblemSchema.parse({ title: 'T', url: 'https://example.com/p' }),
    ).toMatchObject({ topicIds: [], status: 'unsolved' });
  });

  it('update rejects empty patch', () => {
    expect(() => updateProblemSchema.parse({})).toThrow();
  });

  it('update accepts status only', () => {
    expect(updateProblemSchema.parse({ status: 'solved' })).toEqual({
      status: 'solved',
    });
  });

  it('update rejects invalid status', () => {
    expect(() =>
      updateProblemSchema.parse({ status: 'done' }),
    ).toThrow();
  });
});