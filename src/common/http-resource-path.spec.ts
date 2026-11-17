import { describe, expect, test } from 'vitest';
import { httpResourcePath } from './http-resource-path.js';

describe('httpResourcePath', () => {
  test('normalizes base and path', () => {
    expect(
      httpResourcePath({ baseUrl: '/media', path: '/' } as never),
    ).toBe('/media');
    expect(
      httpResourcePath({ baseUrl: '', path: '/users/me/profile' } as never),
    ).toBe('/users/me/profile');
  });
});