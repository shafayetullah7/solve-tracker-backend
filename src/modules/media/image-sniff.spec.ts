import { describe, expect, test } from 'vitest';
import { mimeMatchesBuffer, sniffImageMime } from './image-sniff.js';

describe('image-sniff', () => {
  test('detects PNG', () => {
    const buf = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
    ]);
    expect(sniffImageMime(buf)).toBe('image/png');
    expect(mimeMatchesBuffer('image/png', buf)).toBe(true);
  });

  test('rejects MIME/buffer mismatch', () => {
    const buf = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
    ]);
    expect(mimeMatchesBuffer('image/jpeg', buf)).toBe(false);
  });
});