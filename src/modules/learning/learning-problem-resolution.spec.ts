import { describe, expect, it } from 'vitest';
import { learningBlockType } from '../../database/schema/learning/learning-block-type.enum.js';
import {
  enrichBlocksWithProblemResolution,
  toProblemResolution,
} from './learning-problem-resolution.js';
import type { BlockResponse } from './schemas/learning-blocks.schema.js';

const url = 'https://leetcode.com/problems/two-sum/';

describe('toProblemResolution', () => {
  it('returns unresolved when URL is missing from the map', () => {
    expect(toProblemResolution(new Map(), url)).toEqual({ problemResolution: 'unresolved' });
  });

  it('maps unsolved and solved rows', () => {
    const map = new Map([
      [url, { problemId: '11111111-1111-4111-8111-111111111111', status: 'unsolved' as const }],
    ]);
    expect(toProblemResolution(map, url)).toEqual({
      problemResolution: 'linked_unsolved',
      problemId: '11111111-1111-4111-8111-111111111111',
    });
    map.set(url, { problemId: '11111111-1111-4111-8111-111111111111', status: 'solved' });
    expect(toProblemResolution(map, url)).toEqual({
      problemResolution: 'solved',
      problemId: '11111111-1111-4111-8111-111111111111',
    });
  });
});

describe('enrichBlocksWithProblemResolution', () => {
  const base: BlockResponse = {
    id: '22222222-2222-4222-8222-222222222222',
    position: 0,
    type: learningBlockType.Problem,
    payload: { url, normalizedUrl: url },
    schemaVersion: 1,
  };

  it('leaves non-problem blocks unchanged', () => {
    const text: BlockResponse = { ...base, type: learningBlockType.Text, payload: { body: 'hi' } };
    expect(
      enrichBlocksWithProblemResolution([text], new Map(), new Map()),
    ).toEqual([text]);
  });

  it('attaches resolution for problem blocks', () => {
    const linkByBlockId = new Map([[base.id, url]]);
    const statusMap = new Map([
      [url, { problemId: '11111111-1111-4111-8111-111111111111', status: 'unsolved' as const }],
    ]);
    const [enriched] = enrichBlocksWithProblemResolution([base], linkByBlockId, statusMap);
    expect(enriched?.problemResolution).toBe('linked_unsolved');
    expect(enriched?.problemId).toBe('11111111-1111-4111-8111-111111111111');
  });
});