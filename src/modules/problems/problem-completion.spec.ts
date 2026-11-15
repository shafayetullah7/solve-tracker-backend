import { describe, expect, it } from 'vitest';
import { applyCompletionTransition } from './problem-completion.js';

const solvedAt = new Date('2026-06-01T12:00:00.000Z');
const now = new Date('2026-07-01T08:00:00.000Z');

describe('applyCompletionTransition', () => {
  it('unsolved to solved sets solvedAt', () => {
    expect(
      applyCompletionTransition(
        { status: 'unsolved', solvedAt: null },
        'solved',
        now,
      ),
    ).toEqual({ status: 'solved', solvedAt: now });
  });

  it('solved to solved preserves solvedAt', () => {
    expect(
      applyCompletionTransition(
        { status: 'solved', solvedAt },
        'solved',
        now,
      ),
    ).toEqual({ status: 'solved', solvedAt });
  });

  it('solved to unsolved clears solvedAt', () => {
    expect(
      applyCompletionTransition(
        { status: 'solved', solvedAt },
        'unsolved',
        now,
      ),
    ).toEqual({ status: 'unsolved', solvedAt: null });
  });

  it('unsolved to unsolved is no-op', () => {
    expect(
      applyCompletionTransition(
        { status: 'unsolved', solvedAt: null },
        'unsolved',
        now,
      ),
    ).toBeNull();
  });
});