import { describe, expect, it } from 'vitest';
import {
  createProblemSchema,
  listProblemsQuerySchema,
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

  it('list rejects invalid platform', () => {
    expect(() =>
      listProblemsQuerySchema.parse({ platform: 'hackerrank' }),
    ).toThrow();
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