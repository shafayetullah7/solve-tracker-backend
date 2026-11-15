import { describe, expect, it } from 'vitest';
import { percentComplete } from './progress-percent.js';

describe('percentComplete', () => {
  it('returns 0 when total is 0', () => {
    expect(percentComplete(0, 0)).toBe(0);
    expect(percentComplete(5, 0)).toBe(0);
  });

  it('returns 100 when all solved', () => {
    expect(percentComplete(3, 3)).toBe(100);
  });

  it('rounds to nearest integer', () => {
    expect(percentComplete(1, 3)).toBe(33);
    expect(percentComplete(2, 3)).toBe(67);
  });
});