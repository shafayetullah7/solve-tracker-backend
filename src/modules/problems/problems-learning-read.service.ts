import { Injectable } from '@nestjs/common';
import { ProblemsRepository } from './problems.repository.js';

export type ProblemLinkStatus = 'solved' | 'unsolved';

@Injectable()
export class ProblemsLearningReadService {
  constructor(private readonly repo: ProblemsRepository) {}

  findStatusesByNormalizedUrls(
    learnerId: string,
    normalizedUrls: readonly string[],
  ): Promise<Map<string, { problemId: string; status: ProblemLinkStatus }>> {
    return this.repo.findStatusesByNormalizedUrls(learnerId, normalizedUrls);
  }
}