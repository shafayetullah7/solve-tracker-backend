import { describe, expect, it } from 'vitest';
import {
  buildDifficultyHistogram,
  DIFFICULTY_HISTOGRAM_BUCKETS,
} from './difficulty-histogram.js';

describe('difficulty-histogram', () => {
  it('returns six buckets', () => {
    const hist = buildDifficultyHistogram([
      { difficulty: 'Easy', rating: null },
      { difficulty: 'Hard', rating: null },
      { difficulty: null, rating: 1200 },
      { difficulty: null, rating: 2800 },
    ]);
    expect(hist).toHaveLength(DIFFICULTY_HISTOGRAM_BUCKETS);
    expect(hist.reduce((a, b) => a + b, 0)).toBe(4);
  });
});