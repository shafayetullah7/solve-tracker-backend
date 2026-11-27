import { Injectable } from '@nestjs/common';
import { AttemptsRepository } from '../assessments/attempts.repository.js';
import { DatabaseService } from '../../database/database.service.js';
import { ProblemsLearningReadService } from '../problems/problems-learning-read.service.js';
import { loadPublishedGateThresholds } from './learning-gate-assessment.validation.js';
import { LearningGuidesRepository } from './learning-guides.repository.js';
import {
  collectAssessmentIds,
  groupAssessmentLinksByNode,
  groupProblemLinksByNode,
  resolveGatedCompleteNodeIdsFromData,
} from './learning-gated-completion.js';

@Injectable()
export class LearningGatedCompletionService {
  constructor(
    private readonly attemptsRepository: AttemptsRepository,
    private readonly guidesRepository: LearningGuidesRepository,
    private readonly problemsLearningRead: ProblemsLearningReadService,
    private readonly database: DatabaseService,
  ) {}

  async resolveCompleteGatedNodeIds(
    enrollmentId: string,
    guideId: string,
    learnerId: string,
  ): Promise<Set<string>> {
    const assessmentRows = await this.attemptsRepository.listGatedNodeAssessments(guideId);
    const problemRows = await this.guidesRepository.findGatedProblemLinksForGuide(guideId);
    const byNodeAssessments = groupAssessmentLinksByNode(assessmentRows);
    const byNodeProblems = groupProblemLinksByNode(problemRows);
    const assessmentIds = collectAssessmentIds(assessmentRows);
    const problemUrls = [...new Set(problemRows.map((row) => row.normalizedUrl))];
    const [thresholds, bestScores, problemStatuses] = await Promise.all([
      loadPublishedGateThresholds(this.database.db, guideId, assessmentIds),
      this.attemptsRepository.mapBestFinalizedScores(enrollmentId, assessmentIds),
      this.problemsLearningRead.findStatusesByNormalizedUrls(learnerId, problemUrls),
    ]);
    return resolveGatedCompleteNodeIdsFromData(
      byNodeAssessments,
      byNodeProblems,
      thresholds,
      bestScores,
      problemStatuses,
    );
  }
}