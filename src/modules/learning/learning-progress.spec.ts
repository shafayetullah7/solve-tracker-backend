import { describe, expect, it } from 'vitest';
import { summarizeProgress } from './learning-progress.js';

describe('summarizeProgress', () => {
  it('returns null percent when no required nodes', () => {
    expect(summarizeProgress([{ id: 'a', required: false }], new Set())).toEqual({
      completedRequired: 0,
      totalRequired: 0,
      percent: null,
    });
  });

  it('counts only required nodes', () => {
    const nodes = [
      { id: 'a', required: true },
      { id: 'b', required: false },
      { id: 'c', required: true },
    ];
    expect(summarizeProgress(nodes, new Set(['a']))).toEqual({
      completedRequired: 1,
      totalRequired: 2,
      percent: 50,
    });
  });
});