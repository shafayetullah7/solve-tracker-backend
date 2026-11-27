import { Injectable } from '@nestjs/common';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import {
  learningAssessments,
  learningAssessmentRevisions,
  learningGuides,
  learningQuestions,
} from '../../database/schema/index.js';
import { DRAFT_REVISION_NUMBER } from '../../database/schema/learning/learning-assessment-revisions.table.js';

@Injectable()
export class AssessmentsRepository {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  async findOwnedGuide(ownerId: string, guideId: string) {
    const [row] = await this.db
      .select({ id: learningGuides.id, archivedAt: learningGuides.archivedAt })
      .from(learningGuides)
      .where(
        and(
          eq(learningGuides.ownerId, ownerId),
          eq(learningGuides.id, guideId),
          isNull(learningGuides.deletedAt),
        ),
      );
    return row;
  }

  async listByGuide(guideId: string) {
    return this.db
      .select({
        id: learningAssessments.id,
        title: learningAssessments.title,
        activeRevisionId: learningAssessments.activeRevisionId,
      })
      .from(learningAssessments)
      .where(and(eq(learningAssessments.guideId, guideId), isNull(learningAssessments.archivedAt)))
      .orderBy(asc(learningAssessments.title));
  }

  async countDraftQuestions(assessmentId: string): Promise<number> {
    const draft = await this.findDraftRevision(assessmentId);
    if (!draft) return 0;
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(learningQuestions)
      .where(eq(learningQuestions.revisionId, draft.id));
    return Number(row?.count ?? 0);
  }

  async findOwnedAssessment(ownerId: string, guideId: string, assessmentId: string) {
    const [row] = await this.db
      .select({
        assessment: learningAssessments,
      })
      .from(learningAssessments)
      .innerJoin(learningGuides, eq(learningGuides.id, learningAssessments.guideId))
      .where(
        and(
          eq(learningGuides.ownerId, ownerId),
          eq(learningAssessments.guideId, guideId),
          eq(learningAssessments.id, assessmentId),
          isNull(learningGuides.deletedAt),
        ),
      );
    return row?.assessment;
  }

  async findDraftRevision(assessmentId: string) {
    const [row] = await this.db
      .select()
      .from(learningAssessmentRevisions)
      .where(
        and(
          eq(learningAssessmentRevisions.assessmentId, assessmentId),
          eq(learningAssessmentRevisions.revisionNumber, DRAFT_REVISION_NUMBER),
        ),
      );
    return row;
  }

  async listDraftQuestions(revisionId: string) {
    return this.db
      .select()
      .from(learningQuestions)
      .where(eq(learningQuestions.revisionId, revisionId))
      .orderBy(asc(learningQuestions.position));
  }
}