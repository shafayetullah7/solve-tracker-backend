import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, isNull, isNotNull, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import {
  learningGuides,
  learningNodes,
  learningEnrollments,
  learningBlocks,
  learningNodeProgress,
  learningProblemLinks,
} from '../../database/schema/index.js';
import { learningNodeCompletionMode } from '../../database/schema/learning/learning-node-completion-mode.enum.js';
import type { LearningGuide } from '../../database/schema/index.js';
import type { RecoveryQuery } from './schemas/learning-nodes.schema.js';
import { MAX_NODES } from './learning-hierarchy.js';
import type { ListGuidesQuery } from './schemas/learning-guides.schema.js';

@Injectable()
export class LearningGuidesRepository {
  constructor(private readonly database: DatabaseService) {}

  async findOwned(ownerId: string, guideId: string): Promise<LearningGuide | undefined> {
    const [row] = await this.database.db.select().from(learningGuides).where(and(
      eq(learningGuides.ownerId, ownerId),
      eq(learningGuides.id, guideId),
      isNull(learningGuides.deletedAt),
    ));
    return row;
  }

  async findOwnedTree(ownerId: string, guideId: string) {
    // One statement gives the revision and active nodes from the same snapshot.
    return this.database.db.select({
      structureRevision: learningGuides.structureRevision,
      node: {
        id: learningNodes.id, parentId: learningNodes.parentId,
        title: learningNodes.title, position: learningNodes.position,
        required: learningNodes.required, completionMode: learningNodes.completionMode,
        contentRevision: learningNodes.contentRevision, requirementRevision: learningNodes.requirementRevision,
      },
    }).from(learningGuides).leftJoin(learningNodes, and(
      eq(learningNodes.guideId, learningGuides.id), isNull(learningNodes.deletedAt),
    )).where(and(
      eq(learningGuides.ownerId, ownerId), eq(learningGuides.id, guideId),
      isNull(learningGuides.deletedAt),
    )).limit(MAX_NODES + 1);
  }

  async findEnrollment(ownerId: string, guideId: string) {
    const [row] = await this.database.db.select({
      id: learningEnrollments.id, guideId: learningEnrollments.guideId,
      resumeNodeId: learningEnrollments.resumeNodeId, lastActivityAt: learningEnrollments.lastActivityAt,
    }).from(learningEnrollments).innerJoin(learningGuides, eq(learningGuides.id, learningEnrollments.guideId))
      .where(and(eq(learningGuides.ownerId, ownerId), eq(learningGuides.id, guideId),
        eq(learningEnrollments.learnerId, ownerId), isNull(learningGuides.deletedAt)));
    return row;
  }

  async listRecoverable(ownerId: string, guideId: string, query: RecoveryQuery) {
    return this.database.db.select({
      id: learningNodes.id, title: learningNodes.title, parentId: learningNodes.parentId,
      deletedAt: learningNodes.deletedAt,
    }).from(learningNodes).innerJoin(learningGuides, eq(learningGuides.id, learningNodes.guideId))
      .where(and(
        eq(learningGuides.ownerId, ownerId), eq(learningGuides.id, guideId), isNull(learningGuides.deletedAt),
        sql`${learningNodes.deletedAt} > now() - interval '30 days'`,
        sql`not exists (select 1 from learning_nodes as p where p.guide_id = ${learningNodes.guideId}
          and p.id = ${learningNodes.parentId} and p.deletion_batch_id = ${learningNodes.deletionBatchId})`,
      )).orderBy(desc(learningNodes.deletedAt), desc(learningNodes.id))
      .limit(query.pageSize + 1).offset((query.page - 1) * query.pageSize);
  }

  async listOwned(ownerId: string, query: ListGuidesQuery): Promise<{ items: LearningGuide[]; total: number }> {
    const search = query.search?.toLowerCase();
    const where = and(
      eq(learningGuides.ownerId, ownerId),
      query.status === 'deleted'
        ? and(isNotNull(learningGuides.deletedAt), sql`${learningGuides.deletedAt} > now() - interval '30 days'`)
        : and(isNull(learningGuides.deletedAt), query.status === 'archived' ? isNotNull(learningGuides.archivedAt) : isNull(learningGuides.archivedAt)),
      search ? sql`(strpos(lower(${learningGuides.title}), ${search}) > 0 or strpos(lower(${learningGuides.description}), ${search}) > 0)` : undefined,
    );
    const [total] = await this.database.db.select({ total: count() }).from(learningGuides).where(where);
    const items = await this.database.db.select().from(learningGuides).where(where)
      .orderBy(desc(learningGuides.updatedAt), desc(learningGuides.id))
      .limit(query.pageSize).offset((query.page - 1) * query.pageSize);
    return { items, total: total?.total ?? 0 };
  }

  async findNodeBlocks(ownerId: string, guideId: string, nodeId: string) {
    const [node] = await this.database.db.select({
      contentRevision: learningNodes.contentRevision,
    }).from(learningNodes).innerJoin(learningGuides, eq(learningGuides.id, learningNodes.guideId))
      .where(and(
        eq(learningGuides.ownerId, ownerId),
        eq(learningGuides.id, guideId),
        eq(learningNodes.id, nodeId),
        isNull(learningGuides.deletedAt),
        isNull(learningNodes.deletedAt),
      ));
    if (!node) return undefined;
    const blocks = await this.database.db.select({
      id: learningBlocks.id,
      position: learningBlocks.position,
      type: learningBlocks.type,
      payload: learningBlocks.payload,
      schemaVersion: learningBlocks.schemaVersion,
    }).from(learningBlocks).where(and(
      eq(learningBlocks.guideId, guideId),
      eq(learningBlocks.nodeId, nodeId),
    )).orderBy(learningBlocks.position);
    return { contentRevision: node.contentRevision, blocks };
  }

  async findGatedProblemLinksForGuide(guideId: string) {
    return this.database.db
      .select({
        nodeId: learningBlocks.nodeId,
        blockId: learningProblemLinks.blockId,
        normalizedUrl: learningProblemLinks.normalizedUrl,
      })
      .from(learningNodes)
      .innerJoin(
        learningBlocks,
        and(
          eq(learningBlocks.guideId, learningNodes.guideId),
          eq(learningBlocks.nodeId, learningNodes.id),
        ),
      )
      .innerJoin(
        learningProblemLinks,
        and(
          eq(learningProblemLinks.guideId, learningBlocks.guideId),
          eq(learningProblemLinks.blockId, learningBlocks.id),
        ),
      )
      .where(
        and(
          eq(learningNodes.guideId, guideId),
          eq(learningNodes.completionMode, learningNodeCompletionMode.Gated),
          isNull(learningNodes.deletedAt),
        ),
      );
  }

  async findProblemLinksForGuide(ownerId: string, guideId: string) {
    return this.database.db
      .select({
        blockId: learningProblemLinks.blockId,
        nodeId: learningBlocks.nodeId,
        normalizedUrl: learningProblemLinks.normalizedUrl,
      })
      .from(learningProblemLinks)
      .innerJoin(learningBlocks, and(
        eq(learningBlocks.guideId, learningProblemLinks.guideId),
        eq(learningBlocks.id, learningProblemLinks.blockId),
      ))
      .innerJoin(learningGuides, eq(learningGuides.id, learningProblemLinks.guideId))
      .where(and(
        eq(learningGuides.ownerId, ownerId),
        eq(learningGuides.id, guideId),
        isNull(learningGuides.deletedAt),
      ));
  }

  async findCompletedNodeIds(ownerId: string, guideId: string): Promise<Set<string>> {
    const rows = await this.database.db.select({ nodeId: learningNodeProgress.nodeId })
      .from(learningNodeProgress)
      .innerJoin(learningEnrollments, eq(learningEnrollments.id, learningNodeProgress.enrollmentId))
      .innerJoin(learningGuides, eq(learningGuides.id, learningEnrollments.guideId))
      .where(and(
        eq(learningGuides.ownerId, ownerId),
        eq(learningGuides.id, guideId),
        eq(learningEnrollments.learnerId, ownerId),
        isNull(learningGuides.deletedAt),
      ));
    return new Set(rows.map((row) => row.nodeId));
  }
}
