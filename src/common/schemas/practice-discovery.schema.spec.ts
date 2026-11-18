import { describe, expect, it } from 'vitest';
import {
  practiceGoalPatchSchema,
  practiceGoalSchema,
  practiceVisibilitySchema,
  topicDescriptionSchema,
  TOPIC_DESCRIPTION_MAX,
} from './practice-discovery.schema.js';

describe('practice-discovery.schema', () => {
  it('accepts visibility values', () => {
    expect(practiceVisibilitySchema.parse('private')).toBe('private');
    expect(practiceVisibilitySchema.parse('summary')).toBe('summary');
    expect(practiceVisibilitySchema.parse('topics')).toBe('topics');
    expect(() => practiceVisibilitySchema.parse('public')).toThrow();
  });

  it('accepts goals and null patch', () => {
    expect(practiceGoalSchema.parse('interview')).toBe('interview');
    expect(practiceGoalPatchSchema.parse(null)).toBeNull();
    expect(() => practiceGoalSchema.parse('other')).toThrow();
  });

  it('enforces description length by code point', () => {
    const ok = 'a'.repeat(TOPIC_DESCRIPTION_MAX);
    expect(topicDescriptionSchema.parse(ok)).toBe(ok);
    const over = 'a'.repeat(TOPIC_DESCRIPTION_MAX + 1);
    expect(() => topicDescriptionSchema.parse(over)).toThrow();
    expect(topicDescriptionSchema.parse('  hi  ')).toBe('hi');
  });

  it('rejects control characters in description', () => {
    expect(() => topicDescriptionSchema.parse('bad\nline')).toThrow();
  });
});