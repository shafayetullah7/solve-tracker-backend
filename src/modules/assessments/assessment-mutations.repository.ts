import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { and, asc, count, eq, lte, sql } from 'drizzle-orm';
import { UserLockRepository, type DbTx } from '../../database/user-lock.repository.js';
import {
  learningAssessments,
  learningAssessmentRevisions,
  learningGuides,
  learningOperations,
  learningQuestions,
  type LearningAssessment,
} from '../../database/schema/index.js';
import { DRAFT_REVISION_NUMBER } from '../../database/schema/learning/learning-assessment-revisions.table.js';
import type { LearningAssessmentFeedbackPolicy } from '../../database/schema/learning/learning-assessment-feedback-policy.enum.js';
import { learningError } from '../learning/learning.errors.js';
import { validateAddQuestionInput } from './assessment-question.validation.js';
import type { AddQuestionInput } from './schemas/assessment-question.schema.js';

const DAY = 86400000;
const MAX_RECEIPTS = 10000;

export type AssessmentMutationReceipt = { resourceId: string; replayed: boolean };

@Injectable()
export class AssessmentMutationsRepository {
  constructor(private readonly accounts: UserLockRepository) {}

  private async execute(
    actorId: string,
    guideId: string,
    operationId: string,
    payload: readonly unknown[],
    work: (tx: DbTx) => Promise<string>,
  ): Promise<AssessmentMutationReceipt> {
    const hash = createHash('sha256').update(JSON.stringify(['assessment.v1', ...payload])).digest('hex');
    const result = await this.accounts.withLockedUser(actorId, async (tx) => {
      const now = new Date();
      const [receipt] = await tx
        .select()
        .from(learningOperations)
        .where(
          and(
            eq(learningOperations.actorId, actorId),
            eq(learningOperations.operationId, operationId),
          ),
        );
      if (receipt) {
        if (receipt.requestHash !== hash || receipt.expiresAt <= now) {
          throw learningError(409, 'LEARNING_OPERATION_CONFLICT', 'Operation cannot be replayed.');
        }
        await this.lockGuide(tx, actorId, guideId);
        return { resourceId: receipt.resourceId, replayed: true };
      }
      await tx.delete(learningOperations).where(
        and(eq(learningOperations.actorId, actorId), lte(learningOperations.expiresAt, now)),
      );
      const [usage] = await tx
        .select({ total: count() })
        .from(learningOperations)
        .where(eq(learningOperations.actorId, actorId));
      if ((usage?.total ?? 0) >= MAX_RECEIPTS) {
        throw learningError(429, 'LEARNING_OPERATION_LIMIT', 'Operation limit reached.');
      }
      await this.lockGuide(tx, actorId, guideId);
      const resourceId = await work(tx);
      await tx.insert(learningOperations).values({
        actorId,
        operationId,
        requestHash: hash,
        resourceId,
        expiresAt: new Date(now.getTime() + 7 * DAY),
      });
      return { resourceId, replayed: false };
    });
    if (!result) throw learningError(404, 'NOT_FOUND', 'Account was not found.');
    return result;
  }

  private async lockGuide(tx: DbTx, ownerId: string, guideId: string) {
    const [row] = await tx
      .select()
      .from(learningGuides)
      .where(and(eq(learningGuides.ownerId, ownerId), eq(learningGuides.id, guideId)))
      .for('update');
    if (!row) throw learningError(404, 'NOT_FOUND', 'Guide was not found.');
    if (row.archivedAt) {
      throw learningError(409, 'GUIDE_ARCHIVED', 'Restore the guide before editing assessments.');
    }
    return row;
  }

  private async lockOwnedAssessment(
    tx: DbTx,
    ownerId: string,
    guideId: string,
    assessmentId: string,
  ): Promise<LearningAssessment> {
    await this.lockGuide(tx, ownerId, guideId);
    const [row] = await tx
      .select({ assessment: learningAssessments })
      .from(learningAssessments)
      .innerJoin(learningGuides, eq(learningGuides.id, learningAssessments.guideId))
      .where(
        and(
          eq(learningGuides.ownerId, ownerId),
          eq(learningAssessments.guideId, guideId),
          eq(learningAssessments.id, assessmentId),
        ),
      )
      .for('update');
    if (!row) throw learningError(404, 'NOT_FOUND', 'Assessment was not found.');
    return row.assessment;
  }

  async createAssessment(
    ownerId: string,
    guideId: string,
    title: string,
    operationId: string,
  ): Promise<AssessmentMutationReceipt> {
    return this.execute(ownerId, guideId, operationId, ['create', guideId, title], async (tx) => {
      const [assessment] = await tx.insert(learningAssessments).values({ guideId, title }).returning();
      await tx.insert(learningAssessmentRevisions).values({
        guideId,
        assessmentId: assessment.id,
        revisionNumber: DRAFT_REVISION_NUMBER,
      });
      return assessment.id;
    });
  }

  async patchAssessment(
    ownerId: string,
    guideId: string,
    assessmentId: string,
    title: string,
    operationId: string,
  ): Promise<AssessmentMutationReceipt> {
    return this.execute(
      ownerId,
      guideId,
      operationId,
      ['patch', guideId, assessmentId, title],
      async (tx) => {
        await this.lockOwnedAssessment(tx, ownerId, guideId, assessmentId);
        await tx
          .update(learningAssessments)
          .set({ title, updatedAt: new Date() })
          .where(eq(learningAssessments.id, assessmentId));
        return assessmentId;
      },
    );
  }

  async addDraftQuestion(
    ownerId: string,
    guideId: string,
    assessmentId: string,
    revisionId: string,
    input: AddQuestionInput,
    operationId: string,
  ): Promise<AssessmentMutationReceipt> {
    const issue = validateAddQuestionInput(input);
    if (issue) throw new Error('VALIDATION');
    return this.execute(
      ownerId,
      guideId,
      operationId,
      ['question', guideId, assessmentId, input.kind, input.prompt, input.gradingConfig, input.points],
      async (tx) => {
        await this.lockOwnedAssessment(tx, ownerId, guideId, assessmentId);
        const [maxRow] = await tx
          .select({ max: sql<number>`coalesce(max(${learningQuestions.position}), -1)::int` })
          .from(learningQuestions)
          .where(eq(learningQuestions.revisionId, revisionId));
        const position = (maxRow?.max ?? -1) + 1;
        await tx.insert(learningQuestions).values({
          guideId,
          assessmentId,
          revisionId,
          position,
          kind: input.kind,
          prompt: input.prompt,
          gradingConfig: input.gradingConfig,
          points: input.points,
        });
        await tx
          .update(learningAssessments)
          .set({ updatedAt: new Date() })
          .where(eq(learningAssessments.id, assessmentId));
        return assessmentId;
      },
    );
  }

  async publish(
    ownerId: string,
    guideId: string,
    assessmentId: string,
    passingBasisPoints: number,
    feedbackPolicy: LearningAssessmentFeedbackPolicy,
    operationId: string,
  ): Promise<AssessmentMutationReceipt> {
    return this.execute(
      ownerId,
      guideId,
      operationId,
      ['publish', guideId, assessmentId, passingBasisPoints, feedbackPolicy],
      async (tx) => {
        await this.lockOwnedAssessment(tx, ownerId, guideId, assessmentId);
        const [assessment] = await tx
          .select()
          .from(learningAssessments)
          .where(eq(learningAssessments.id, assessmentId));
        if (!assessment) throw new Error('NOT_FOUND');

        const [draft] = await tx
          .select()
          .from(learningAssessmentRevisions)
          .where(
            and(
              eq(learningAssessmentRevisions.assessmentId, assessmentId),
              eq(learningAssessmentRevisions.revisionNumber, DRAFT_REVISION_NUMBER),
            ),
          );
        if (!draft) throw new Error('NO_DRAFT');
        const draftQuestions = await tx
          .select()
          .from(learningQuestions)
          .where(eq(learningQuestions.revisionId, draft.id))
          .orderBy(asc(learningQuestions.position));
        if (draftQuestions.length === 0) throw new Error('NO_QUESTIONS');

        const [maxRow] = await tx
          .select({
            max: sql<number>`coalesce(max(${learningAssessmentRevisions.revisionNumber}), 0)::int`,
          })
          .from(learningAssessmentRevisions)
          .where(
            and(
              eq(learningAssessmentRevisions.assessmentId, assessmentId),
              sql`${learningAssessmentRevisions.revisionNumber} > 0`,
            ),
          );
        const nextRevision = (maxRow?.max ?? 0) === 0 ? 1 : maxRow.max + 1;

        const [published] = await tx
          .insert(learningAssessmentRevisions)
          .values({
            guideId,
            assessmentId,
            revisionNumber: nextRevision,
            passingBasisPoints,
            feedbackPolicy,
          })
          .returning();

        for (const q of draftQuestions) {
          await tx.insert(learningQuestions).values({
            guideId,
            assessmentId,
            revisionId: published.id,
            position: q.position,
            kind: q.kind,
            prompt: q.prompt,
            gradingConfig: q.gradingConfig,
            points: q.points,
          });
        }

        await tx
          .update(learningAssessments)
          .set({ activeRevisionId: published.id, updatedAt: new Date() })
          .where(eq(learningAssessments.id, assessmentId));

        return assessmentId;
      },
    );
  }
}