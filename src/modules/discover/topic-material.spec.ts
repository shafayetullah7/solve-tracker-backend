import { describe, expect, it } from 'vitest';
import {
  meetsKAnonymity,
  publicListScore,
  rankPublicLists,
  topPatternRows,
  type PublicListRankRow,
} from './topic-material.js';

function list(
  partial: Partial<PublicListRankRow> & { handle: string; ownerUserId: string },
): PublicListRankRow {
  return {
    topicId: partial.topicId ?? partial.handle,
    ownerUserId: partial.ownerUserId,
    handle: partial.handle,
    name: partial.name ?? partial.handle,
    description: partial.description ?? '',
    total: partial.total ?? 10,
    solved: partial.solved ?? 5,
    copies30d: partial.copies30d ?? 0,
  };
}

describe('topic-material', () => {
  it('description bonus increases score', () => {
    const base = list({ handle: 'a', ownerUserId: '1', description: '' });
    const withDesc = list({ handle: 'b', ownerUserId: '2', description: 'x' });
    expect(publicListScore(withDesc)).toBeGreaterThan(publicListScore(base));
  });

  it('max one list per owner in top 10', () => {
    const rows = [
      list({ handle: 'z', ownerUserId: '1', copies30d: 100 }),
      list({ handle: 'y', ownerUserId: '1', copies30d: 50 }),
      list({ handle: 'x', ownerUserId: '2', copies30d: 40 }),
    ];
    const ranked = rankPublicLists(rows, 10);
    expect(ranked).toHaveLength(2);
    expect(ranked.every((r) => r.ownerUserId !== '1' || r.handle === 'z')).toBe(true);
  });

  it('k-1 hides pattern', () => {
    expect(
      topPatternRows(
        [{ normalizedName: 'dp', name: 'DP', percent: 80 }],
        5,
        9,
        10,
      ),
    ).toHaveLength(0);
  });

  it('k shows pattern', () => {
    const out = topPatternRows(
      [{ normalizedName: 'dp', name: 'DP', percent: 80 }],
      5,
      10,
      10,
    );
    expect(out).toHaveLength(1);
    expect(meetsKAnonymity(10, 10)).toBe(true);
  });
});