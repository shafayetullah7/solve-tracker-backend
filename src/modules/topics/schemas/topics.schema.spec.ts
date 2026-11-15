import { describe, expect, it } from 'vitest';
import {
  createTopicSchema,
  listTopicsQuerySchema,
} from './topics.schema.js';

describe('topics schemas', () => {
  it('rejects unknown body fields', () => {
    expect(
      createTopicSchema.safeParse({ name: 'Arrays', userId: 'x' }).success,
    ).toBe(false);
  });

  it('applies list defaults and max pageSize', () => {
    expect(listTopicsQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 25,
    });
    expect(
      listTopicsQuerySchema.safeParse({ pageSize: 101 }).success,
    ).toBe(false);
  });
});