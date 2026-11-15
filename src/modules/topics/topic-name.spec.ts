import { describe, expect, it } from 'vitest';
import { prepareTopicName, TopicNameError } from './topic-name.js';

describe('prepareTopicName', () => {
  it('trims, normalizes case, and enforces length', () => {
    expect(prepareTopicName('  Monotonic Stack  ')).toEqual({
      name: 'Monotonic Stack',
      normalizedName: 'monotonic stack',
    });
    expect(() => prepareTopicName('   ')).toThrow(TopicNameError);
  });
});