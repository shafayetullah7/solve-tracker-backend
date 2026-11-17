import { describe, expect, test } from 'vitest';
import { buildCloudinaryImageUrl } from './media-delivery.js';

describe('buildCloudinaryImageUrl', () => {
  test('encodes public id path segments', () => {
    const url = buildCloudinaryImageUrl(
      'demo',
      'users/u1/photo name',
      'webp',
    );
    expect(url).toBe(
      'https://res.cloudinary.com/demo/image/upload/users/u1/photo%20name.webp',
    );
  });
});