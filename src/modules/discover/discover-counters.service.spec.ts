import { describe, expect, it } from 'vitest';
import { DiscoverCountersService } from './discover-counters.service.js';

describe('DiscoverCountersService', () => {
  it('dedupes views per viewer per day and excludes self', async () => {
    const db = {
      insert: () => ({
        values: () => ({
          onConflictDoUpdate: async () => {},
        }),
      }),
    };
    const service = new DiscoverCountersService({ db } as never);
    const viewer = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const subject = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

    await service.recordProfileView(viewer, subject);
    await service.recordProfileView(viewer, subject);
    await service.recordProfileView(subject, subject);

    const dedupe = (service as { viewDedupe: Map<string, true> }).viewDedupe;
    expect(dedupe.size).toBe(1);
  });
});