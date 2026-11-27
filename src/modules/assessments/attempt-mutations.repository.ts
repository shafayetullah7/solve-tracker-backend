import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { and, count, eq, lte } from 'drizzle-orm';
import { UserLockRepository, type DbTx } from '../../database/user-lock.repository.js';
import {
  learningAnswers,
  learningAttempts,
  learningGuides,
  learningOperations,
  learningQuestions,
} from '../../database/schema/index.js';
import { learningAttemptStatus } from '../../database/schema/learning/learning-attempt-status.enum.js';
import { learningError } from '../learning/learning.errors.js';
import {
  computeScoreBasisPoints,
  gradeObjectiveAnswer,
  meetsPassingThreshold,
} from './grading/grade-objective.js';
import type { SaveAnswerInput } from './schemas/attempt.schema.js';

const DAY = 86400000;
const MAX_RECEIPTS = 10000;

export type AttemptMutationReceipt = { resourceId: string; replayed: boolean };

@Injectable()
export class AttemptMutationsRepository {
  constructor(private readonly accounts: UserLockRepository) {}

  private async execute(
    actorId: string,
    guideId: string,
    operationId: string,
    payload: readonly unknown[],
    work: (tx: DbTx) => Promise<string>,
  ): Promise<AttemptMutationReceipt> {
    const hash = createHash('sha256').update(JSON.stringify(['attempt.v1', ...payload])).digest('hex');
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
        await this.lockGuide(tx, guideId);
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
      await this.lockGuide(tx, guideId);
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

  private async lockGuide(tx: DbTx, guideId: string) {
    const [row] = await tx
      .select({ id: learningGuides.id })
      .from(learningGuides)
      .where(eq(learningGuides.id, guideId))
      .for('update');
    if (!row) throw learningError(404, 'NOT_FOUND', 'Guide was not found.');
  }

  async saveAnswer(
    actorId: string,
    guideId: string,
    assessmentId: string,
    attemptId: string,
    revisionId: string,
    input: SaveAnswerInput,
    operationId: string,
  ): Promise<AttemptMutationReceipt> {
    return this.execute(
      actorId,
      guideId,
      operationId,
      ['save', guideId, assessmentId, attemptId, input.questionId, input.response],
      async (tx) => {
        await tx
          .insert(learningAnswers)
          .values({
            attemptId,
            questionId: input.questionId,
            revisionId,
            response: input.response ?? {},
          })
          .onConflictDoUpdate({
            target: [learningAnswers.attemptId, learningAnswers.questionId],
            set: { response: input.response ?? {}, updatedAt: new Date() },
          });
        return attemptId;
      },
    );
  }

  async finalizeSubmit(
    actorId: string,
    guideId: string,
    assessmentId: string,
    attemptId: string,
    revisionId: string,
    passingBasisPoints: number,
    operationId: string,
  ): Promise<AttemptMutationReceipt> {
    return this.execute(
      actorId,
      guideId,
      operationId,
      ['submit', guideId, assessmentId, attemptId, revisionId],
      async (tx) => {
        const [attempt] = await tx
          .select()
          .from(learningAttempts)
          .where(eq(learningAttempts.id, attemptId))
          .for('update');
        if (!attempt) throw learningError(404, 'NOT_FOUND', 'Attempt was not found.');
        if (attempt.status === learningAttemptStatus.Finalized) return attemptId;

        const questions = await tx
          .select()
          .from(learningQuestions)
          .where(eq(learningQuestions.revisionId, revisionId));
        const answers = await tx
          .select()
          .from(learningAnswers)
          .where(eq(learningAnswers.attemptId, attemptId));
        const byQuestion = new Map(answers.map((a) => [a.questionId, a]));

        let earned = 0;
        let possible = 0;
        for (const q of questions) {
          possible += q.points;
          const ans = byQuestion.get(q.id);
          const graded = gradeObjectiveAnswer(q, ans?.response ?? null);
          earned += graded.awardedPoints;
          await tx
            .insert(learningAnswers)
            .values({
              attemptId,
              questionId: q.id,
              revisionId,
              response: ans?.response ?? {},
              awardedPoints: graded.awardedPoints,
            })
            .onConflictDoUpdate({
              target: [learningAnswers.attemptId, learningAnswers.questionId],
              set: { awardedPoints: graded.awardedPoints, updatedAt: new Date() },
            });
        }

        const scoreBasisPoints = computeScoreBasisPoints(earned, possible);
        const now = new Date();
        await tx
          .update(learningAttempts)
          .set({
            status: learningAttemptStatus.Finalized,
            submittedAt: now,
            finalizedAt: now,
            earnedPoints: earned,
            possiblePoints: possible,
            scoreBasisPoints,
            updatedAt: now,
          })
          .where(eq(learningAttempts.id, attemptId));
        meetsPassingThreshold(earned, possible, passingBasisPoints);
        return attemptId;
      },
    );
  }
}