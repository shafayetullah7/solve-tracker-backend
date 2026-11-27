import { Injectable } from '@nestjs/common';
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { loadPublishedGateThresholds } from '../learning/learning-gate-assessment.validation.js';
import { DatabaseService } from '../../database/database.service.js';
import {
  learningAnswers,
  learningAssessmentLinks,
  learningAssessmentRevisions,
  learningAssessments,
  learningAttempts,
  learningBlocks,
  learningEnrollments,
  learningNodes,
  learningQuestions,
} from '../../database/schema/index.js';
import { learningNodeCompletionMode } from '../../database/schema/learning/learning-node-completion-mode.enum.js';
import { learningAttemptStatus } from '../../database/schema/learning/learning-attempt-status.enum.js';

@Injectable()
export class AttemptsRepository {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  async findEnrollment(guideId: string, learnerId: string) {
    const [row] = await this.db
      .select()
      .from(learningEnrollments)
      .where(
        and(eq(learningEnrollments.guideId, guideId), eq(learningEnrollments.learnerId, learnerId)),
      );
    return row;
  }

  async findPublishedAssessment(guideId: string, assessmentId: string) {
    const [row] = await this.db
      .select({
        assessment: learningAssessments,
        revision: learningAssessmentRevisions,
      })
      .from(learningAssessments)
      .innerJoin(
        learningAssessmentRevisions,
        eq(learningAssessmentRevisions.id, learningAssessments.activeRevisionId),
      )
      .where(
        and(eq(learningAssessments.guideId, guideId), eq(learningAssessments.id, assessmentId)),
      );
    return row;
  }

  async findActiveInProgress(enrollmentId: string, assessmentId: string) {
    const [row] = await this.db
      .select()
      .from(learningAttempts)
      .where(
        and(
          eq(learningAttempts.enrollmentId, enrollmentId),
          eq(learningAttempts.assessmentId, assessmentId),
          eq(learningAttempts.status, learningAttemptStatus.InProgress),
        ),
      );
    return row;
  }

  async startAttempt(
    guideId: string,
    enrollmentId: string,
    assessmentId: string,
    revisionId: string,
  ) {
    const existing = await this.findActiveInProgress(enrollmentId, assessmentId);
    if (existing) return { attempt: existing, resumed: true as const };
    const [row] = await this.db
      .insert(learningAttempts)
      .values({
        guideId,
        enrollmentId,
        assessmentId,
        revisionId,
        status: learningAttemptStatus.InProgress,
      })
      .returning();
    return { attempt: row, resumed: false as const };
  }

  async findRevisionById(guideId: string, assessmentId: string, revisionId: string) {
    const [row] = await this.db
      .select({ passingBasisPoints: learningAssessmentRevisions.passingBasisPoints })
      .from(learningAssessmentRevisions)
      .where(
        and(
          eq(learningAssessmentRevisions.guideId, guideId),
          eq(learningAssessmentRevisions.assessmentId, assessmentId),
          eq(learningAssessmentRevisions.id, revisionId),
        ),
      );
    return row;
  }

  async findQuestionOnRevision(revisionId: string, questionId: string) {
    const [row] = await this.db
      .select({ id: learningQuestions.id })
      .from(learningQuestions)
      .where(
        and(eq(learningQuestions.revisionId, revisionId), eq(learningQuestions.id, questionId)),
      );
    return row;
  }

  async listRevisionQuestions(revisionId: string) {
    return this.db
      .select()
      .from(learningQuestions)
      .where(eq(learningQuestions.revisionId, revisionId))
      .orderBy(asc(learningQuestions.position));
  }

  async listAnswers(attemptId: string) {
    return this.db.select().from(learningAnswers).where(eq(learningAnswers.attemptId, attemptId));
  }

  async findAttempt(attemptId: string) {
    const [row] = await this.db.select().from(learningAttempts).where(eq(learningAttempts.id, attemptId));
    return row;
  }

  async listGatedNodeAssessments(guideId: string) {
    return this.db
      .select({
        nodeId: learningBlocks.nodeId,
        assessmentId: learningAssessmentLinks.assessmentId,
      })
      .from(learningNodes)
      .innerJoin(
        learningBlocks,
        and(eq(learningBlocks.guideId, learningNodes.guideId), eq(learningBlocks.nodeId, learningNodes.id)),
      )
      .innerJoin(learningAssessmentLinks, eq(learningAssessmentLinks.blockId, learningBlocks.id))
      .where(
        and(
          eq(learningNodes.guideId, guideId),
          eq(learningNodes.completionMode, learningNodeCompletionMode.Gated),
          isNull(learningNodes.deletedAt),
        ),
      );
  }

  async resolveGatedCompleteNodeIds(
    enrollmentId: string,
    guideId: string,
  ): Promise<Set<string>> {
    const rows = await this.listGatedNodeAssessments(guideId);
    const byNode = new Map<string, string[]>();
    const allAssessmentIds: string[] = [];
    for (const row of rows) {
      const list = byNode.get(row.nodeId) ?? [];
      list.push(row.assessmentId);
      byNode.set(row.nodeId, list);
      allAssessmentIds.push(row.assessmentId);
    }
    const thresholds = await loadPublishedGateThresholds(this.db, guideId, allAssessmentIds);
    const bestScores = await this.mapBestFinalizedScores(enrollmentId, allAssessmentIds);
    const complete = new Set<string>();
    for (const [nodeId, assessmentIds] of byNode) {
      if (assessmentIds.length === 0) continue;
      let allPass = true;
      for (const assessmentId of assessmentIds) {
        const passing = thresholds.get(assessmentId);
        if (passing === undefined) {
          allPass = false;
          break;
        }
        const best = bestScores.get(assessmentId) ?? null;
        if (best === null || best < passing) {
          allPass = false;
          break;
        }
      }
      if (allPass) complete.add(nodeId);
    }
    return complete;
  }

  private async mapBestFinalizedScores(enrollmentId: string, assessmentIds: readonly string[]) {
    const unique = [...new Set(assessmentIds)];
    if (unique.length === 0) return new Map<string, number>();
    const rows = await this.db
      .select({
        assessmentId: learningAttempts.assessmentId,
        best: sql<number>`max(${learningAttempts.scoreBasisPoints})::int`,
      })
      .from(learningAttempts)
      .where(
        and(
          eq(learningAttempts.enrollmentId, enrollmentId),
          inArray(learningAttempts.assessmentId, unique),
          eq(learningAttempts.status, learningAttemptStatus.Finalized),
        ),
      )
      .groupBy(learningAttempts.assessmentId);
    return new Map(rows.map((row) => [row.assessmentId, row.best]));
  }

  async bestFinalizedScoreBasisPoints(enrollmentId: string, assessmentId: string) {
    const [row] = await this.db
      .select({ best: learningAttempts.scoreBasisPoints })
      .from(learningAttempts)
      .where(
        and(
          eq(learningAttempts.enrollmentId, enrollmentId),
          eq(learningAttempts.assessmentId, assessmentId),
          eq(learningAttempts.status, learningAttemptStatus.Finalized),
        ),
      )
      .orderBy(desc(learningAttempts.scoreBasisPoints))
      .limit(1);
    return row?.best ?? null;
  }
}