import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { and, count, eq, lte, isNull, inArray, sql } from 'drizzle-orm';
import { UserLockRepository, type DbTx } from '../../database/user-lock.repository.js';
import { learningGuides, learningEnrollments, learningOperations, learningNodes, type LearningGuide } from '../../database/schema/index.js';
import { learningError } from './learning.errors.js';
import type { CreateGuideInput, PatchGuideInput } from './schemas/learning-guides.schema.js';

import { buildHierarchy, planPlacement, HierarchyError, MAX_NODES } from './learning-hierarchy.js';
import type { CreateNodeInput } from './schemas/learning-nodes.schema.js';

const DAY = 86400000;
const MAX_GUIDES = 100;
const MAX_RECEIPTS = 10000;

type Lifecycle = 'archive' | 'unarchive' | 'delete' | 'restore';
type Receipt = { resourceId: string; replayed: boolean };

@Injectable()
export class LearningGuideMutationsRepository {
  constructor(private readonly accounts: UserLockRepository) {}

  private async execute(
    actorId: string,
    operationId: string,
    payload: readonly unknown[],
    work: (tx: DbTx, now: Date) => Promise<string>,
    replayGuideId?: string,
  ): Promise<Receipt> {
    const hash = createHash('sha256').update(JSON.stringify(['v1', ...payload])).digest('hex');
    const result = await this.accounts.withLockedUser(actorId, async (tx) => {
      const now = new Date();
      const [receipt] = await tx.select().from(learningOperations).where(and(
        eq(learningOperations.actorId, actorId),
        eq(learningOperations.operationId, operationId),
      ));
      if (receipt) {
        if (receipt.requestHash !== hash || receipt.expiresAt <= now)
          throw learningError(409, 'LEARNING_OPERATION_CONFLICT', 'Operation cannot be replayed.');
        await this.lockGuide(tx, actorId, replayGuideId ?? receipt.resourceId);
        return { resourceId: receipt.resourceId, replayed: true };
      }
      await tx.delete(learningOperations).where(and(
        eq(learningOperations.actorId, actorId), lte(learningOperations.expiresAt, now),
      ));
      const [usage] = await tx.select({ total: count() }).from(learningOperations)
        .where(eq(learningOperations.actorId, actorId));
      if ((usage?.total ?? 0) >= MAX_RECEIPTS)
        throw learningError(429, 'LEARNING_OPERATION_LIMIT', 'Operation limit reached.');
      const resourceId = await work(tx, now);
      await tx.insert(learningOperations).values({
        actorId, operationId, requestHash: hash, resourceId,
        expiresAt: new Date(now.getTime() + 7 * DAY),
      });
      return { resourceId, replayed: false };
    });
    if (!result) throw learningError(404, 'NOT_FOUND', 'Account was not found.');
    return result;
  }

  private async lockGuide(tx: DbTx, ownerId: string, id: string): Promise<LearningGuide> {
    const [row] = await tx.select().from(learningGuides).where(and(
      eq(learningGuides.ownerId, ownerId), eq(learningGuides.id, id),
    )).for('update');
    if (!row) throw learningError(404, 'NOT_FOUND', 'Guide was not found.');
    return row;
  }

  private checkRevision(row: LearningGuide, expected: string): void {
    if (row.metadataRevision.toString() !== expected)
      throw learningError(409, 'LEARNING_REVISION_CONFLICT', 'Guide metadata changed.');
  }

  async create(ownerId: string, input: CreateGuideInput): Promise<Receipt> {
    return this.execute(ownerId, input.operationId, ['create', input.title, input.description], async (tx) => {
      const [usage] = await tx.select({ total: count() }).from(learningGuides)
        .where(eq(learningGuides.ownerId, ownerId));
      if ((usage?.total ?? 0) >= MAX_GUIDES)
        throw learningError(409, 'LEARNING_GUIDE_LIMIT', 'Retained guide limit reached.');
      const [guide] = await tx.insert(learningGuides).values({
        ownerId, title: input.title, description: input.description,
      }).returning({ id: learningGuides.id });
      if (!guide) throw new Error('Guide insert returned no row.');
      await tx.insert(learningEnrollments).values({ guideId: guide.id, learnerId: ownerId });
      return guide.id;
    });
  }

  async createNode(ownerId: string, guideId: string, input: CreateNodeInput): Promise<Receipt> {
    return this.execute(ownerId, input.operationId, [
      'node.create', guideId, input.expectedStructureRevision, input.parentId,
      input.beforeNodeId, input.title, input.required, input.completionMode,
    ], async (tx, now) => {
      const guide = await this.lockGuide(tx, ownerId, guideId);
      if (guide.deletedAt) throw learningError(404, 'NOT_FOUND', 'Guide was not found.');
      if (guide.archivedAt) throw learningError(409, 'LEARNING_LIFECYCLE_CONFLICT', 'Guide is archived.');
      if (guide.structureRevision.toString() !== input.expectedStructureRevision)
        throw learningError(409, 'LEARNING_REVISION_CONFLICT', 'Guide structure changed.');
      const nodes = await tx.select().from(learningNodes).where(and(
        eq(learningNodes.guideId, guideId), isNull(learningNodes.deletedAt),
      )).limit(MAX_NODES + 1);
      // Detect corrupt persisted state separately from invalid user placement.
      buildHierarchy(nodes);
      const plan = (() => {
        try {
          return planPlacement(nodes, null, input.parentId, input.beforeNodeId);
        } catch (error) {
          if (error instanceof HierarchyError)
            throw learningError(409, 'LEARNING_INVALID_PLACEMENT', error.message);
          throw error;
        }
      })();
      const shifted = plan.destination.slice(plan.index).map(node => node.id);
      if (shifted.length) {
        const scope = and(eq(learningNodes.guideId, guideId), isNull(learningNodes.deletedAt), inArray(learningNodes.id, shifted));
        // Temporary positions are disjoint from all existing and final positions.
        await tx.update(learningNodes).set({ position: sql`${learningNodes.position} + 1000` }).where(scope);
        await tx.update(learningNodes).set({ position: sql`${learningNodes.position} - 999`, updatedAt: now }).where(scope);
      }
      const [node] = await tx.insert(learningNodes).values({
        guideId, parentId: input.parentId, position: plan.index, title: input.title,
        required: input.required, completionMode: input.completionMode,
      }).returning({ id: learningNodes.id });
      if (!node) throw new Error('Node insert returned no row.');
      await tx.update(learningGuides).set({ structureRevision: guide.structureRevision + 1n, updatedAt: now })
        .where(and(eq(learningGuides.id, guideId), eq(learningGuides.ownerId, ownerId)));
      return node.id;
    }, guideId);
  }

  async patch(ownerId: string, id: string, input: PatchGuideInput): Promise<Receipt> {
    return this.execute(ownerId, input.operationId, ['patch', id, input.expectedMetadataRevision, input.title ?? null, input.description ?? null], async (tx, now) => {
      const row = await this.lockGuide(tx, ownerId, id);
      if (row.deletedAt) throw learningError(404, 'NOT_FOUND', 'Guide was not found.');
      if (row.archivedAt) throw learningError(409, 'LEARNING_LIFECYCLE_CONFLICT', 'Restore the archived guide before editing.');
      this.checkRevision(row, input.expectedMetadataRevision);
      const title = input.title ?? row.title;
      const description = input.description ?? row.description;
      if (title !== row.title || description !== row.description)
        await tx.update(learningGuides).set({ title, description, metadataRevision: row.metadataRevision + 1n, updatedAt: now })
          .where(and(eq(learningGuides.ownerId, ownerId), eq(learningGuides.id, id)));
      return id;
    });
  }

  async lifecycle(ownerId: string, id: string, action: Lifecycle, expected: string, operationId: string): Promise<Receipt> {
    return this.execute(ownerId, operationId, [action, id, expected], async (tx, now) => {
      const row = await this.lockGuide(tx, ownerId, id);
      if (row.deletedAt && action !== 'restore')
        throw learningError(404, 'NOT_FOUND', 'Guide was not found.');
      this.checkRevision(row, expected);
      let archivedAt = row.archivedAt;
      let deletedAt = row.deletedAt;
      if (action === 'archive') archivedAt ??= now;
      if (action === 'unarchive') archivedAt = null;
      if (action === 'delete') deletedAt = now;
      if (action === 'restore') {
        if (!deletedAt || now.getTime() - deletedAt.getTime() >= 30 * DAY)
          throw learningError(409, 'LEARNING_LIFECYCLE_CONFLICT', 'Guide is not recoverable.');
        deletedAt = null;
      }
      if (archivedAt !== row.archivedAt || deletedAt !== row.deletedAt)
        await tx.update(learningGuides).set({ archivedAt, deletedAt, metadataRevision: row.metadataRevision + 1n, updatedAt: now })
          .where(and(eq(learningGuides.ownerId, ownerId), eq(learningGuides.id, id)));
      return id;
    });
  }
}
