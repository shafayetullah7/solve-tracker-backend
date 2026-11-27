import { describe, expect, it } from 'vitest';
import { learningBlockType } from '../../database/schema/learning/learning-block-type.enum.js';
import { normalizeBlockPayload, sanitizeTextBody } from './learning-block-payload.js';

describe('sanitizeTextBody', () => {
  it('strips script tags and markup', () => {
    expect(sanitizeTextBody('<p>Hello</p><script>alert(1)</script>')).toBe('Hello');
  });
});

describe('normalizeBlockPayload', () => {
  it('normalizes text payload', () => {
    expect(normalizeBlockPayload('text', { body: '  hi  ' })).toEqual({ body: 'hi' });
  });

  it('normalizes problem payload from author URL', () => {
    const normalized = normalizeBlockPayload(learningBlockType.Problem, {
      url: 'https://leetcode.com/problems/two-sum/',
      label: ' Two Sum ',
    });
    expect(normalized).toMatchObject({
      url: 'https://leetcode.com/problems/two-sum/',
      normalizedUrl: 'https://leetcode.com/problems/two-sum/',
      label: 'Two Sum',
    });
  });

  it('passes through stored problem payload', () => {
    expect(
      normalizeBlockPayload(learningBlockType.Problem, {
        url: 'https://leetcode.com/problems/two-sum/',
        normalizedUrl: 'https://leetcode.com/problems/two-sum/',
      }),
    ).toEqual({
      url: 'https://leetcode.com/problems/two-sum/',
      normalizedUrl: 'https://leetcode.com/problems/two-sum/',
    });
  });
});