import { describe, expect, it } from 'vitest';
import { prepareProblemTitle, ProblemTitleError } from './problem-title.js';

describe('prepareProblemTitle', () => {
  it('trims and enforces length', () => {
    expect(prepareProblemTitle('  Two Sum  ')).toBe('Two Sum');
    expect(() => prepareProblemTitle('   ')).toThrow(ProblemTitleError);
    expect(() => prepareProblemTitle('x'.repeat(201))).toThrow(ProblemTitleError);
  });
});