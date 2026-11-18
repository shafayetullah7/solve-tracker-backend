import { describe, expect, it } from 'vitest';
import { encodeTopicKey, decodeTopicKey } from './topic-key.js';

describe('topic-key', () => {
  it('round-trips ascii', () => {
    const name = 'graphs';
    expect(decodeTopicKey(encodeTopicKey(name))).toBe(name);
  });

  it('round-trips spaces', () => {
    const name = 'two pointers';
    expect(decodeTopicKey(encodeTopicKey(name))).toBe(name);
  });

  it('rejects overlong keys', () => {
    const long = 'a'.repeat(101);
    expect(() => decodeTopicKey(encodeTopicKey(long))).toThrow();
  });
});