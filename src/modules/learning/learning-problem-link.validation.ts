import { HttpException } from '@nestjs/common';
import { platformSlugFromUrl } from '../../shared/platform-catalog.js';
import { prepareProblemUrl, ProblemUrlError } from '../problems/problem-url.js';
import { learningError } from './learning.errors.js';

export function prepareLinkableProblemUrl(raw: string): { url: string; normalizedUrl: string } {
  try {
    const prepared = prepareProblemUrl(raw);
    if (!platformSlugFromUrl(prepared.normalizedUrl)) {
      throw learningError(
        400,
        'PROBLEM_PLATFORM_UNSUPPORTED',
        'Problem URL must be from a supported judge platform.',
      );
    }
    return prepared;
  } catch (error) {
    if (error instanceof HttpException) throw error;
    if (error instanceof ProblemUrlError) {
      throw learningError(400, 'PROBLEM_URL_INVALID', error.message);
    }
    throw error;
  }
}