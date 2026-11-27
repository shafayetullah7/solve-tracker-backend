import { describe, expect, it } from 'vitest';
import {
  assessmentsPassForNode,
  problemsPassForNode,
  resolveGatedCompleteNodeIdsFromData,
} from './learning-gated-completion.js';

describe('learning-gated-completion', () => {
  it('assessment-only gated node matches 4C pass rule', () => {
    const byAssessments = new Map([['n1', ['a1']]]);
    const thresholds = new Map([['a1', 4000]]);
    const bestScores = new Map([['a1', 5000]]);
    const result = resolveGatedCompleteNodeIdsFromData(
      byAssessments,
      new Map(),
      thresholds,
      bestScores,
      new Map(),
    );
    expect(result.has('n1')).toBe(true);
  });

  it('problem-only gated node completes when all URLs solved', () => {
    const byProblems = new Map([['n2', ['https://leetcode.com/problems/foo/']]]);
    const statuses = new Map([
      ['https://leetcode.com/problems/foo/', { problemId: 'p1', status: 'solved' as const }],
    ]);
    const result = resolveGatedCompleteNodeIdsFromData(
      new Map(),
      byProblems,
      new Map(),
      new Map(),
      statuses,
    );
    expect(result.has('n2')).toBe(true);
  });

  it('problem-only gated node stays incomplete when a URL is unsolved', () => {
    const byProblems = new Map([['n2', ['https://leetcode.com/problems/foo/']]]);
    const statuses = new Map([
      ['https://leetcode.com/problems/foo/', { problemId: 'p1', status: 'unsolved' as const }],
    ]);
    const result = resolveGatedCompleteNodeIdsFromData(
      new Map(),
      byProblems,
      new Map(),
      new Map(),
      statuses,
    );
    expect(result.has('n2')).toBe(false);
  });

  it('combined assessment and problem require both', () => {
    const byAssessments = new Map([['n3', ['a1']]]);
    const byProblems = new Map([['n3', ['https://leetcode.com/problems/bar/']]]);
    const thresholds = new Map([['a1', 4000]]);
    const bestScores = new Map([['a1', 5000]]);
    const solved = new Map([
      ['https://leetcode.com/problems/bar/', { problemId: 'p2', status: 'solved' as const }],
    ]);
    expect(
      resolveGatedCompleteNodeIdsFromData(
        byAssessments,
        byProblems,
        thresholds,
        bestScores,
        solved,
      ).has('n3'),
    ).toBe(true);
    expect(
      resolveGatedCompleteNodeIdsFromData(
        byAssessments,
        byProblems,
        thresholds,
        bestScores,
        new Map(),
      ).has('n3'),
    ).toBe(false);
    expect(
      resolveGatedCompleteNodeIdsFromData(
        byAssessments,
        byProblems,
        thresholds,
        new Map(),
        solved,
      ).has('n3'),
    ).toBe(false);
  });

  it('gated node with zero links never completes', () => {
    const result = resolveGatedCompleteNodeIdsFromData(
      new Map(),
      new Map(),
      new Map(),
      new Map(),
      new Map(),
    );
    expect(result.size).toBe(0);
  });

  it('removing solved status drops node from complete set', () => {
    const byProblems = new Map([['n4', ['https://leetcode.com/problems/baz/']]]);
    const solved = new Map([
      ['https://leetcode.com/problems/baz/', { problemId: 'p3', status: 'solved' as const }],
    ]);
    const unsolved = new Map([
      ['https://leetcode.com/problems/baz/', { problemId: 'p3', status: 'unsolved' as const }],
    ]);
    expect(
      resolveGatedCompleteNodeIdsFromData(
        new Map(),
        byProblems,
        new Map(),
        new Map(),
        solved,
      ).has('n4'),
    ).toBe(true);
    expect(
      resolveGatedCompleteNodeIdsFromData(
        new Map(),
        byProblems,
        new Map(),
        new Map(),
        unsolved,
      ).has('n4'),
    ).toBe(false);
  });

  it('assessmentsPassForNode fails on missing threshold or score', () => {
    expect(assessmentsPassForNode(['a1'], new Map(), new Map())).toBe(false);
    expect(assessmentsPassForNode(['a1'], new Map([['a1', 5000]]), new Map())).toBe(false);
    expect(
      assessmentsPassForNode(['a1'], new Map([['a1', 5000]]), new Map([['a1', 4000]])),
    ).toBe(false);
  });

  it('problemsPassForNode treats missing URL as fail', () => {
    expect(problemsPassForNode(['https://leetcode.com/problems/x/'], new Map())).toBe(false);
    expect(problemsPassForNode([], new Map())).toBe(true);
  });
});