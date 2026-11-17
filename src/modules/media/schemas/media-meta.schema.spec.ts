import { describe, expect, test } from 'vitest';
import { parseMediaMeta, parseMediaRecord } from './media-meta.schema.js';

describe('media-meta.schema', () => {
  test('parseMediaMeta image', () => {
    expect(parseMediaMeta('image', { bytes: 100, width: 10, height: 20 })).toEqual({
      bytes: 100,
      width: 10,
      height: 20,
    });
  });

  test('parseMediaMeta rejects missing dimensions', () => {
    expect(() => parseMediaMeta('image', { bytes: 1 })).toThrow();
  });

  test('parseMediaRecord', () => {
    const row = {
      id: 'id',
      userId: 'user',
      usageCount: 1,
      provider: 'cloudinary',
      publicId: 'users/u/abc',
      resourceType: 'image' as const,
      extension: 'webp',
      meta: { bytes: 50, width: 5, height: 5 },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(parseMediaRecord(row).meta.height).toBe(5);
  });
});