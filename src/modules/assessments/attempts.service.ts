import { Injectable } from '@nestjs/common';
import { learningError } from '../learning/learning.errors.js';
import { learningAttemptStatus } from '../../database/schema/learning/learning-attempt-status.enum.js';
import { AssessmentsRepository } from './assessments.repository.js';
import { AttemptMutationsRepository } from './attempt-mutations.repository.js';
import { AttemptsRepository } from './attempts.repository.js';
import type { SaveAnswerInput, SubmitAttemptInput } from './schemas/attempt.schema.js';
import { meetsPassingThreshold } from './grading/grade-objective.js';
import { assessmentIdSchema, guideIdParamSchema } from './schemas/assessment.schema.js';
import { attemptIdSchema } from './schemas/attempt.schema.js';

export type AttemptStartResult = { resumed: boolean; body: Awaited<ReturnType<AttemptsService['toResponse']>> };

@Injectable()
export class AttemptsService {
  constructor(
    private readonly attempts: AttemptsRepository,
    private readonly assessments: AssessmentsRepository,
    private readonly mutations: AttemptMutationsRepository,
  ) {}

  private parseGuideId(raw: string): string {
    const parsed = guideIdParamSchema.safeParse(raw);
    if (!parsed.success) throw learningError(400, 'VALIDATION_ERROR', 'Invalid guide id.');
    return parsed.data;
  }

  private parseAssessmentId(raw: string): string {
    const parsed = assessmentIdSchema.safeParse(raw);
    if (!parsed.success) throw learningError(400, 'VALIDATION_ERROR', 'Invalid assessment id.');
    return parsed.data;
  }

  private parseAttemptId(raw: string): string {
    const parsed = attemptIdSchema.safeParse(raw);
    if (!parsed.success) throw learningError(400, 'VALIDATION_ERROR', 'Invalid attempt id.');
    return parsed.data;
  }

  private async assertLearner(ownerId: string, rawGuideId: string) {
    const guideId = this.parseGuideId(rawGuideId);
    const guide = await this.assessments.findOwnedGuide(ownerId, guideId);
    if (!guide) throw learningError(404, 'NOT_FOUND', 'Guide was not found.');
    const enrollment = await this.attempts.findEnrollment(guideId, ownerId);
    if (!enrollment) throw learningError(404, 'NOT_FOUND', 'Enrollment was not found.');
    return { enrollment, guideId };
  }

  private async revisionPassingBasisPoints(
    guideId: string,
    assessmentId: string,
    revisionId: string,
  ): Promise<number> {
    const revision = await this.attempts.findRevisionById(guideId, assessmentId, revisionId);
    return revision?.passingBasisPoints ?? 7000;
  }

  async start(ownerId: string, rawGuideId: string, rawAssessmentId: string): Promise<AttemptStartResult> {
    const { enrollment, guideId } = await this.assertLearner(ownerId, rawGuideId);
    const assessmentId = this.parseAssessmentId(rawAssessmentId);
    const published = await this.attempts.findPublishedAssessment(guideId, assessmentId);
    if (!published) throw learningError(404, 'NOT_FOUND', 'Published assessment was not found.');
    const { attempt, resumed } = await this.attempts.startAttempt(
      guideId,
      enrollment.id,
      assessmentId,
      published.revision.id,
    );
    const passing = await this.revisionPassingBasisPoints(guideId, assessmentId, attempt.revisionId);
    return {
      resumed,
      body: await this.toResponse(attempt.id, passing),
    };
  }

  async saveAnswer(
    ownerId: string,
    rawGuideId: string,
    rawAssessmentId: string,
    rawAttemptId: string,
    input: SaveAnswerInput,
  ) {
    const attemptId = this.parseAttemptId(rawAttemptId);
    const { guideId } = await this.assertLearner(ownerId, rawGuideId);
    const assessmentId = this.parseAssessmentId(rawAssessmentId);
    const attempt = await this.attempts.findAttempt(attemptId);
    if (!attempt || attempt.assessmentId !== assessmentId || attempt.guideId !== guideId) {
      throw learningError(404, 'NOT_FOUND', 'Attempt was not found.');
    }
    if (attempt.status !== learningAttemptStatus.InProgress) {
      throw learningError(409, 'ATTEMPT_FINALIZED', 'Attempt is already finalized.');
    }
    const question = await this.attempts.findQuestionOnRevision(attempt.revisionId, input.questionId);
    if (!question) throw learningError(404, 'NOT_FOUND', 'Question was not found.');
    await this.mutations.saveAnswer(
      ownerId,
      guideId,
      assessmentId,
      attemptId,
      attempt.revisionId,
      input,
      input.operationId,
    );
    const passing = await this.revisionPassingBasisPoints(guideId, assessmentId, attempt.revisionId);
    return this.toResponse(attemptId, passing);
  }

  async submit(
    ownerId: string,
    rawGuideId: string,
    rawAssessmentId: string,
    rawAttemptId: string,
    input: SubmitAttemptInput,
  ) {
    const attemptId = this.parseAttemptId(rawAttemptId);
    const { guideId } = await this.assertLearner(ownerId, rawGuideId);
    const assessmentId = this.parseAssessmentId(rawAssessmentId);
    const attempt = await this.attempts.findAttempt(attemptId);
    if (!attempt || attempt.assessmentId !== assessmentId || attempt.guideId !== guideId) {
      throw learningError(404, 'NOT_FOUND', 'Attempt was not found.');
    }
    const passing = await this.revisionPassingBasisPoints(guideId, assessmentId, attempt.revisionId);
    if (attempt.status === learningAttemptStatus.Finalized) {
      return this.toResponse(attemptId, passing);
    }
    await this.mutations.finalizeSubmit(
      ownerId,
      guideId,
      assessmentId,
      attemptId,
      attempt.revisionId,
      passing,
      input.operationId,
    );
    return this.toResponse(attemptId, passing);
  }

  async get(ownerId: string, rawGuideId: string, rawAssessmentId: string, rawAttemptId: string) {
    const attemptId = this.parseAttemptId(rawAttemptId);
    const { guideId } = await this.assertLearner(ownerId, rawGuideId);
    const assessmentId = this.parseAssessmentId(rawAssessmentId);
    const attempt = await this.attempts.findAttempt(attemptId);
    if (!attempt || attempt.assessmentId !== assessmentId || attempt.guideId !== guideId) {
      throw learningError(404, 'NOT_FOUND', 'Attempt was not found.');
    }
    const passing = await this.revisionPassingBasisPoints(guideId, assessmentId, attempt.revisionId);
    return this.toResponse(attemptId, passing);
  }

  /** Read-only eligibility for LearningModule (4C). */
  async bestScoreBasisPointsForEnrollment(
    enrollmentId: string,
    assessmentId: string,
  ): Promise<number | null> {
    return this.attempts.bestFinalizedScoreBasisPoints(enrollmentId, assessmentId);
  }

  async resolveGatedCompleteNodeIds(
    enrollmentId: string,
    guideId: string,
  ): Promise<Set<string>> {
    return this.attempts.resolveGatedCompleteNodeIds(enrollmentId, guideId);
  }

  private async toResponse(attemptId: string, passingBasisPoints: number) {
    const attempt = await this.attempts.findAttempt(attemptId);
    if (!attempt) throw learningError(404, 'NOT_FOUND', 'Attempt was not found.');
    const questions = await this.attempts.listRevisionQuestions(attempt.revisionId);
    const answers = await this.attempts.listAnswers(attemptId);
    const passed =
      attempt.status === learningAttemptStatus.Finalized &&
      attempt.earnedPoints !== null &&
      attempt.possiblePoints !== null
        ? meetsPassingThreshold(attempt.earnedPoints, attempt.possiblePoints, passingBasisPoints)
        : null;
    return {
      id: attempt.id,
      assessmentId: attempt.assessmentId,
      revisionId: attempt.revisionId,
      status: attempt.status,
      startedAt: attempt.startedAt.toISOString(),
      submittedAt: attempt.submittedAt?.toISOString() ?? null,
      finalizedAt: attempt.finalizedAt?.toISOString() ?? null,
      earnedPoints: attempt.earnedPoints,
      possiblePoints: attempt.possiblePoints,
      scoreBasisPoints: attempt.scoreBasisPoints,
      passingBasisPoints,
      passed,
      questions: questions.map((q) => ({
        id: q.id,
        position: q.position,
        kind: q.kind,
        prompt: q.prompt as Record<string, unknown>,
        points: q.points,
      })),
      answers: answers.map((a) => ({ questionId: a.questionId, response: a.response })),
    };
  }
}