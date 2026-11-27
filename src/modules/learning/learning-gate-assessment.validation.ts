import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { DbTx } from '../../database/user-lock.repository.js';
import { learningAssessmentRevisions, learningAssessments, relations } from '../../database/schema/index.js';
import { learningError } from './learning.errors.js';

type LearningGateDb = NodePgDatabase<typeof relations> | DbTx;

export async function assertLinkableGateAssessment(
  tx: DbTx,
  guideId: string,
  assessmentId: string,
): Promise<void> {
  const [row] = await tx
    .select({
      archivedAt: learningAssessments.archivedAt,
      activeRevisionId: learningAssessments.activeRevisionId,
    })
    .from(learningAssessments)
    .where(and(eq(learningAssessments.guideId, guideId), eq(learningAssessments.id, assessmentId)));
  if (!row) throw learningError(404, 'NOT_FOUND', 'Assessment was not found.');
  if (row.archivedAt) {
    throw learningError(409, 'ASSESSMENT_ARCHIVED', 'Assessment is archived.');
  }
  if (!row.activeRevisionId) {
    throw learningError(409, 'ASSESSMENT_UNPUBLISHED', 'Publish the assessment before linking it.');
  }
}

export async function loadPublishedGateThresholds(
  db: LearningGateDb,
  guideId: string,
  assessmentIds: readonly string[],
): Promise<Map<string, number>> {
  const unique = [...new Set(assessmentIds)];
  if (unique.length === 0) return new Map();
  const rows = await db
    .select({
      assessmentId: learningAssessments.id,
      passingBasisPoints: learningAssessmentRevisions.passingBasisPoints,
    })
    .from(learningAssessments)
    .innerJoin(
      learningAssessmentRevisions,
      eq(learningAssessmentRevisions.id, learningAssessments.activeRevisionId),
    )
    .where(
      and(
        eq(learningAssessments.guideId, guideId),
        inArray(learningAssessments.id, unique),
        isNull(learningAssessments.archivedAt),
      ),
    );
  return new Map(rows.map((row) => [row.assessmentId, row.passingBasisPoints]));
}