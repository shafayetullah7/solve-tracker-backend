import { describe, expect, it } from 'vitest';
import { prepareProblemUrl } from '../../modules/problems/problem-url.js';
import { STARTER_LISTS } from './starter-lists.data.js';

describe('STARTER_LISTS', () => {
  it('has eight curated topics', () => {
    expect(STARTER_LISTS).toHaveLength(8);
  });

  for (const topic of STARTER_LISTS) {
    describe(topic.name, () => {
      it('has between 15 and 30 problems', () => {
        expect(topic.problems.length).toBeGreaterThanOrEqual(15);
        expect(topic.problems.length).toBeLessThanOrEqual(30);
      });

      it('has valid, unique normalized URLs', () => {
        const seen = new Set<string>();
        for (const problem of topic.problems) {
          const { normalizedUrl } = prepareProblemUrl(problem.url);
          expect(seen.has(normalizedUrl)).toBe(false);
          seen.add(normalizedUrl);
        }
      });
    });
  }
});