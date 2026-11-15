import { measureCodePoints } from '../../common/unicode.js';
import { PROBLEM_TITLE_MAX, PROBLEM_TITLE_MIN } from './problem-fields.js';

export class ProblemTitleError extends Error {
  constructor(readonly code: 'EMPTY' | 'TOO_LONG') {
    super(
      code === 'EMPTY'
        ? 'Problem title must not be empty.'
        : `Problem title must contain at most ${PROBLEM_TITLE_MAX} characters.`,
    );
  }
}

export function prepareProblemTitle(raw: string): string {
  const title = raw.trim();
  const length = measureCodePoints(title);
  if (length < PROBLEM_TITLE_MIN) throw new ProblemTitleError('EMPTY');
  if (length > PROBLEM_TITLE_MAX) throw new ProblemTitleError('TOO_LONG');
  return title;
}