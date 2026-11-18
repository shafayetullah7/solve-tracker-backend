import { describe, expect, it } from 'vitest';
import {
  PLATFORM_CATALOG,
  PLATFORM_SLUGS,
} from '../../shared/platform-catalog.js';
import { PlatformsService } from './platforms.service.js';

describe('PlatformsService', () => {
  const service = new PlatformsService();

  it('returns one item per catalog entry', () => {
    const { items } = service.list();
    expect(items).toHaveLength(PLATFORM_CATALOG.length);
  });

  it('returns unique slugs matching PLATFORM_SLUGS', () => {
    const { items } = service.list();
    const slugs = items.map((item) => item.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of PLATFORM_SLUGS) {
      expect(slugs).toContain(slug);
    }
  });

  it('maps catalog fields including urlHosts copies', () => {
    const { items } = service.list();
    const first = items[0];
    const catalogFirst = PLATFORM_CATALOG[0];
    expect(first).toMatchObject({
      slug: catalogFirst?.slug,
      name: catalogFirst?.name,
      baseUrl: catalogFirst?.baseUrl,
    });
    expect(first?.urlHosts).toEqual([...(catalogFirst?.urlHosts ?? [])]);
    expect(first?.urlHosts).not.toBe(catalogFirst?.urlHosts);
  });
});