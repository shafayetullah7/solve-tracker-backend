import { Injectable } from '@nestjs/common';
import { assessmentError } from './assessments.errors.js';
import { AssessmentMutationsRepository } from './assessment-mutations.repository.js';
import { AssessmentsRepository } from './assessments.repository.js';
import { learningError } from '../learning/learning.errors.js';
import { guideIdParamSchema, assessmentIdSchema } from './schemas/assessment.schema.js';
import type { CreateAssessmentInput, PatchAssessmentInput } from './schemas/assessment.schema.js';
import type { AddQuestionInput } from './schemas/assessment-question.schema.js';
import type { PublishAssessmentInput } from './schemas/assessment.schema.js';

@Injectable()
export class AssessmentsService {
  constructor(
    private readonly repo: AssessmentsRepository,
    private readonly mutations: AssessmentMutationsRepository,
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

  private async assertWritable(ownerId: string, guideId: string) {
    const guide = await this.repo.findOwnedGuide(ownerId, guideId);
    if (!guide) throw learningError(404, 'NOT_FOUND', 'Guide was not found.');
    if (guide.archivedAt) {
      throw assessmentError(409, 'GUIDE_ARCHIVED', 'Restore the guide before editing assessments.');
    }
    return guide;
  }

  async list(ownerId: string, rawGuideId: string) {
    const guideId = this.parseGuideId(rawGuideId);
    await this.assertWritable(ownerId, guideId);
    const rows = await this.repo.listByGuide(guideId);
    const items = await Promise.all(
      rows.map(async (row) => ({
        ...row,
        questionCount: await this.repo.countDraftQuestions(row.id),
      })),
    );
    return { items };
  }

  async create(ownerId: string, rawGuideId: string, input: CreateAssessmentInput) {
    const guideId = this.parseGuideId(rawGuideId);
    await this.assertWritable(ownerId, guideId);
    const receipt = await this.mutations.createAssessment(
      ownerId,
      guideId,
      input.title,
      input.operationId,
    );
    return this.get(ownerId, guideId, receipt.resourceId);
  }

  async get(ownerId: string, rawGuideId: string, rawAssessmentId: string) {
    const guideId = this.parseGuideId(rawGuideId);
    const assessmentId = this.parseAssessmentId(rawAssessmentId);
    await this.assertWritable(ownerId, guideId);
    const assessment = await this.repo.findOwnedAssessment(ownerId, guideId, assessmentId);
    if (!assessment) throw learningError(404, 'NOT_FOUND', 'Assessment was not found.');
    const draft = await this.repo.findDraftRevision(assessmentId);
    if (!draft) throw learningError(500, 'INTERNAL', 'Draft revision missing.');
    const questions = await this.repo.listDraftQuestions(draft.id);
    return this.toResponse(assessment, draft.id, questions);
  }

  async getDraft(ownerId: string, rawGuideId: string, rawAssessmentId: string) {
    return this.get(ownerId, rawGuideId, rawAssessmentId);
  }

  async patch(
    ownerId: string,
    rawGuideId: string,
    rawAssessmentId: string,
    input: PatchAssessmentInput,
  ) {
    const guideId = this.parseGuideId(rawGuideId);
    const assessmentId = this.parseAssessmentId(rawAssessmentId);
    await this.assertWritable(ownerId, guideId);
    const existing = await this.repo.findOwnedAssessment(ownerId, guideId, assessmentId);
    if (!existing) throw learningError(404, 'NOT_FOUND', 'Assessment was not found.');
    await this.mutations.patchAssessment(
      ownerId,
      guideId,
      assessmentId,
      input.title!,
      input.operationId,
    );
    return this.get(ownerId, guideId, assessmentId);
  }

  async addQuestion(
    ownerId: string,
    rawGuideId: string,
    rawAssessmentId: string,
    input: AddQuestionInput,
    operationId: string,
  ) {
    const guideId = this.parseGuideId(rawGuideId);
    const assessmentId = this.parseAssessmentId(rawAssessmentId);
    await this.assertWritable(ownerId, guideId);
    const assessment = await this.repo.findOwnedAssessment(ownerId, guideId, assessmentId);
    if (!assessment) throw learningError(404, 'NOT_FOUND', 'Assessment was not found.');
    const draft = await this.repo.findDraftRevision(assessmentId);
    if (!draft) throw learningError(500, 'INTERNAL', 'Draft revision missing.');
    try {
      await this.mutations.addDraftQuestion(
        ownerId,
        guideId,
        assessmentId,
        draft.id,
        input,
        operationId,
      );
    } catch (e) {
      if (e instanceof Error && e.message === 'VALIDATION') {
        throw learningError(400, 'VALIDATION_ERROR', 'correctOptionId must match a prompt option.');
      }
      throw e;
    }
    return this.get(ownerId, guideId, assessmentId);
  }

  async publish(
    ownerId: string,
    rawGuideId: string,
    rawAssessmentId: string,
    input: PublishAssessmentInput,
  ) {
    const guideId = this.parseGuideId(rawGuideId);
    const assessmentId = this.parseAssessmentId(rawAssessmentId);
    await this.assertWritable(ownerId, guideId);
    const assessment = await this.repo.findOwnedAssessment(ownerId, guideId, assessmentId);
    if (!assessment) throw learningError(404, 'NOT_FOUND', 'Assessment was not found.');
    try {
      await this.mutations.publish(
        ownerId,
        guideId,
        assessmentId,
        input.passingBasisPoints,
        input.feedbackPolicy,
        input.operationId,
      );
    } catch (e) {
      if (e instanceof Error && e.message === 'NO_QUESTIONS') {
        throw learningError(400, 'VALIDATION_ERROR', 'Add at least one question before publishing.');
      }
      throw e;
    }
    return this.get(ownerId, guideId, assessmentId);
  }

  private toResponse(
    assessment: {
      id: string;
      guideId: string;
      title: string;
      activeRevisionId: string | null;
      archivedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
    draftRevisionId: string,
    questions: {
      id: string;
      position: number;
      kind: string;
      prompt: unknown;
      gradingConfig: unknown;
      points: number;
    }[],
  ) {
    return {
      id: assessment.id,
      guideId: assessment.guideId,
      title: assessment.title,
      activeRevisionId: assessment.activeRevisionId,
      archivedAt: assessment.archivedAt?.toISOString() ?? null,
      createdAt: assessment.createdAt.toISOString(),
      updatedAt: assessment.updatedAt.toISOString(),
      draftRevisionId,
      draftQuestions: questions.map((q) => ({
        id: q.id,
        position: q.position,
        kind: q.kind,
        prompt: q.prompt as Record<string, unknown>,
        gradingConfig: q.gradingConfig as Record<string, unknown>,
        points: q.points,
      })),
    };
  }
}