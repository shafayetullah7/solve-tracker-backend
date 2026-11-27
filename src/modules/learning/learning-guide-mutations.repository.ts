import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { and, count, eq, lte, isNull, inArray, sql } from 'drizzle-orm';
import { UserLockRepository, type DbTx } from '../../database/user-lock.repository.js';
import {
  learningGuides,
  learningEnrollments,
  learningOperations,
  learningNodes,
  learningBlocks,
  learningAssessmentLinks,
  learningNodeProgress,
  type LearningGuide,
} from '../../database/schema/index.js';
import { learningError } from './learning.errors.js';
import type { CreateGuideInput, PatchGuideInput } from './schemas/learning-guides.schema.js';

import { buildHierarchy, planPlacement, HierarchyError, MAX_NODES } from './learning-hierarchy.js';
import type { CreateNodeInput, MoveNodeInput, PatchNodeInput, ResumeInput } from './schemas/learning-nodes.schema.js';
import type { NodeCompletionInput, ReplaceNodeContentInput } from './schemas/learning-blocks.schema.js';
import { normalizeBlockPayload } from './learning-block-payload.js';
import { assertLinkableGateAssessment } from './learning-gate-assessment.validation.js';
import { learningBlockType } from '../../database/schema/learning/learning-block-type.enum.js';
import { learningNodeCompletionMode } from '../../database/schema/learning/learning-node-completion-mode.enum.js';
import type { PortableGuide } from './schemas/learning-portable.schema.js';

const DAY = 86400000;
const MAX_GUIDES = 100;
const MAX_RETAINED_NODES = 4000;
const MAX_RECEIPTS = 10000;
const MAX_BLOCKS_PER_NODE = 200;

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

  private async checkRetainedCapacity(tx: DbTx, guideId: string, additional: number): Promise<void> {
    const [usage] = await tx.select({ total: count() }).from(learningNodes)
      .where(eq(learningNodes.guideId, guideId));
    if ((usage?.total ?? 0) + additional > MAX_RETAINED_NODES)
      throw learningError(409, 'LEARNING_NODE_LIMIT', 'Retained node limit reached.');
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
      await this.checkRetainedCapacity(tx, guideId, 1);
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

  async resume(ownerId: string, guideId: string, input: ResumeInput): Promise<Receipt> {
    return this.execute(ownerId, input.operationId, [
      'enrollment.resume', guideId, input.nodeId, input.expectedStructureRevision,
    ], async (tx, now) => {
      const guide = await this.lockGuide(tx, ownerId, guideId);
      if (guide.deletedAt) throw learningError(404, 'NOT_FOUND', 'Guide was not found.');
      if (guide.archivedAt) throw learningError(409, 'LEARNING_LIFECYCLE_CONFLICT', 'Guide is archived.');
      if (guide.structureRevision.toString() !== input.expectedStructureRevision)
        throw learningError(409, 'LEARNING_REVISION_CONFLICT', 'Guide structure changed.');
      if (input.nodeId !== null) {
        const [node] = await tx.select({ id: learningNodes.id }).from(learningNodes).where(and(
          eq(learningNodes.guideId, guideId), eq(learningNodes.id, input.nodeId), isNull(learningNodes.deletedAt),
        ));
        if (!node) throw learningError(404, 'NOT_FOUND', 'Node was not found.');
      }
      const [enrollment] = await tx.update(learningEnrollments).set({
        resumeNodeId: input.nodeId, lastActivityAt: now, updatedAt: now,
      }).where(and(eq(learningEnrollments.guideId, guideId), eq(learningEnrollments.learnerId, ownerId)))
        .returning({ id: learningEnrollments.id });
      if (!enrollment) throw learningError(404, 'NOT_FOUND', 'Enrollment was not found.');
      return enrollment.id;
    }, guideId);
  }

  async copyNode(ownerId: string, guideId: string, nodeId: string, input: MoveNodeInput): Promise<Receipt> {
    return this.execute(ownerId, input.operationId, [
      'node.copy', guideId, nodeId, input.expectedStructureRevision, input.parentId, input.beforeNodeId,
    ], async (tx, now) => {
      const guide = await this.lockGuide(tx, ownerId, guideId);
      if (guide.deletedAt) throw learningError(404, 'NOT_FOUND', 'Guide was not found.');
      if (guide.archivedAt) throw learningError(409, 'LEARNING_LIFECYCLE_CONFLICT', 'Guide is archived.');
      if (guide.structureRevision.toString() !== input.expectedStructureRevision)
        throw learningError(409, 'LEARNING_REVISION_CONFLICT', 'Guide structure changed.');
      const nodes = await tx.select().from(learningNodes).where(and(
        eq(learningNodes.guideId, guideId), isNull(learningNodes.deletedAt),
      )).limit(MAX_NODES + 1);
      const tree = buildHierarchy(nodes);
      const root = tree.byId.get(nodeId);
      if (!root) throw learningError(404, 'NOT_FOUND', 'Node was not found.');
      const source = tree.preorder.filter(node => {
        let current: string | null = node.id;
        while (current !== null) {
          if (current === nodeId) return true;
          current = tree.byId.get(current)?.parentId ?? null;
        }
        return false;
      });
      await this.checkRetainedCapacity(tx, guideId, source.length);
      const ids = new Map(source.map(node => [node.id, randomUUID()]));
      const copiedId = ids.get(nodeId);
      if (!copiedId) throw new Error('Missing copied root identity.');
      const { plan, copies } = (() => {
        try {
          const plan = planPlacement(nodes, null, input.parentId, input.beforeNodeId);
          const copies = source.map(node => {
            const id = ids.get(node.id);
            const parentId = node.id === nodeId ? input.parentId : ids.get(node.parentId ?? '');
            if (!id || parentId === undefined) throw new Error('Missing copied node identity.');
            return { id, guideId, parentId, position: node.id === nodeId ? plan.index : node.position,
              title: node.title, required: node.required, completionMode: node.completionMode };
          });
          const shifted = new Set(plan.destination.slice(plan.index).map(node => node.id));
          buildHierarchy([
            ...nodes.map(node => shifted.has(node.id) ? { ...node, position: node.position + 1 } : node),
            ...copies,
          ].map(({ id, parentId, position }) => ({ id, parentId, position })));
          return { plan, copies };
        } catch (error) {
          if (error instanceof HierarchyError)
            throw learningError(409, 'LEARNING_INVALID_PLACEMENT', error.message);
          throw error;
        }
      })();
      const shifted = plan.destination.slice(plan.index).map(node => node.id);
      if (shifted.length) {
        const scope = and(eq(learningNodes.guideId, guideId), isNull(learningNodes.deletedAt), inArray(learningNodes.id, shifted));
        await tx.update(learningNodes).set({ position: sql`${learningNodes.position} + 1000` }).where(scope);
        await tx.update(learningNodes).set({ position: sql`${learningNodes.position} - 999`, updatedAt: now }).where(scope);
      }
      await tx.insert(learningNodes).values(copies);
      await tx.update(learningGuides).set({ structureRevision: guide.structureRevision + 1n, updatedAt: now })
        .where(and(eq(learningGuides.id, guideId), eq(learningGuides.ownerId, ownerId)));
      return copiedId;
    }, guideId);
  }

  async restoreNode(ownerId: string, guideId: string, nodeId: string, input: MoveNodeInput): Promise<Receipt> {
    return this.execute(ownerId, input.operationId, [
      'node.restore', guideId, nodeId, input.expectedStructureRevision, input.parentId, input.beforeNodeId,
    ], async (tx, now) => {
      const guide = await this.lockGuide(tx, ownerId, guideId);
      if (guide.deletedAt) throw learningError(404, 'NOT_FOUND', 'Guide was not found.');
      if (guide.archivedAt) throw learningError(409, 'LEARNING_LIFECYCLE_CONFLICT', 'Guide is archived.');
      if (guide.structureRevision.toString() !== input.expectedStructureRevision)
        throw learningError(409, 'LEARNING_REVISION_CONFLICT', 'Guide structure changed.');
      const [root] = await tx.select().from(learningNodes).where(and(
        eq(learningNodes.guideId, guideId), eq(learningNodes.id, nodeId),
      ));
      if (!root) throw learningError(404, 'NOT_FOUND', 'Node was not found.');
      if (!root.deletedAt || !root.deletionBatchId || now.getTime() - root.deletedAt.getTime() >= 30 * DAY)
        throw learningError(409, 'LEARNING_LIFECYCLE_CONFLICT', 'Subtree is not recoverable.');
      const batch = await tx.select().from(learningNodes).where(and(
        eq(learningNodes.guideId, guideId), eq(learningNodes.deletionBatchId, root.deletionBatchId),
      )).limit(MAX_NODES + 1);
      const batchIds = new Set(batch.map(node => node.id));
      const roots = batch.filter(node => node.parentId === null || !batchIds.has(node.parentId));
      if (roots.length !== 1 || roots[0]?.id !== nodeId)
        throw learningError(409, 'LEARNING_INVALID_PLACEMENT', 'Restore the entire deletion batch from its root.');
      const active = await tx.select().from(learningNodes).where(and(
        eq(learningNodes.guideId, guideId), isNull(learningNodes.deletedAt),
      )).limit(MAX_NODES + 1);
      buildHierarchy(active);
      buildHierarchy(batch.map(node => node.id === nodeId ? { ...node, parentId: null, position: 0 } : node));
      const plan = (() => {
        try {
          const placement = planPlacement(active, null, input.parentId, input.beforeNodeId);
          const shifted = new Set(placement.destination.slice(placement.index).map(node => node.id));
          buildHierarchy([
            ...active.map(node => shifted.has(node.id) ? { ...node, position: node.position + 1 } : node),
            ...batch.map(node => node.id === nodeId ? { ...node, parentId: input.parentId, position: placement.index } : node),
          ]);
          return placement;
        } catch (error) {
          if (error instanceof HierarchyError)
            throw learningError(409, 'LEARNING_INVALID_PLACEMENT', error.message);
          throw error;
        }
      })();
      const shifted = plan.destination.slice(plan.index).map(node => node.id);
      if (shifted.length) {
        const scope = and(eq(learningNodes.guideId, guideId), isNull(learningNodes.deletedAt), inArray(learningNodes.id, shifted));
        await tx.update(learningNodes).set({ position: sql`${learningNodes.position} + 1000` }).where(scope);
        await tx.update(learningNodes).set({ position: sql`${learningNodes.position} - 999`, updatedAt: now }).where(scope);
      }
      await tx.update(learningNodes).set({ parentId: input.parentId, position: plan.index })
        .where(and(eq(learningNodes.guideId, guideId), eq(learningNodes.id, nodeId)));
      await tx.update(learningNodes).set({ deletedAt: null, deletionBatchId: null, updatedAt: now })
        .where(and(eq(learningNodes.guideId, guideId), eq(learningNodes.deletionBatchId, root.deletionBatchId)));
      await tx.update(learningGuides).set({ structureRevision: guide.structureRevision + 1n, updatedAt: now })
        .where(and(eq(learningGuides.id, guideId), eq(learningGuides.ownerId, ownerId)));
      return nodeId;
    }, guideId);
  }

  async deleteNode(ownerId: string, guideId: string, nodeId: string, expected: string, operationId: string): Promise<Receipt> {
    return this.execute(ownerId, operationId, ['node.delete', guideId, nodeId, expected], async (tx, now) => {
      const guide = await this.lockGuide(tx, ownerId, guideId);
      if (guide.deletedAt) throw learningError(404, 'NOT_FOUND', 'Guide was not found.');
      if (guide.archivedAt) throw learningError(409, 'LEARNING_LIFECYCLE_CONFLICT', 'Guide is archived.');
      if (guide.structureRevision.toString() !== expected)
        throw learningError(409, 'LEARNING_REVISION_CONFLICT', 'Guide structure changed.');
      const nodes = await tx.select().from(learningNodes).where(and(
        eq(learningNodes.guideId, guideId), isNull(learningNodes.deletedAt),
      )).limit(MAX_NODES + 1);
      const tree = buildHierarchy(nodes);
      const root = tree.byId.get(nodeId);
      if (!root) throw learningError(404, 'NOT_FOUND', 'Node was not found.');
      const start = tree.preorder.findIndex(node => node.id === nodeId);
      const depth = tree.depths.get(nodeId);
      if (depth === undefined) throw new Error('Missing subtree depth.');
      let end = start + 1;
      while (end < tree.preorder.length) {
        const next = tree.preorder[end];
        if (!next || (tree.depths.get(next.id) ?? 0) <= depth) break;
        end++;
      }
      const ids = tree.preorder.slice(start, end).map(node => node.id);
      const fallback = tree.preorder[end]?.id ?? tree.preorder[start - 1]?.id ?? null;
      await tx.update(learningNodes).set({ deletedAt: now, deletionBatchId: randomUUID(), updatedAt: now })
        .where(and(eq(learningNodes.guideId, guideId), inArray(learningNodes.id, ids), isNull(learningNodes.deletedAt)));
      const shifted = (tree.children.get(root.parentId) ?? []).filter(node => node.position > root.position).map(node => node.id);
      if (shifted.length) {
        const scope = and(eq(learningNodes.guideId, guideId), isNull(learningNodes.deletedAt), inArray(learningNodes.id, shifted));
        await tx.update(learningNodes).set({ position: sql`${learningNodes.position} + 1000` }).where(scope);
        await tx.update(learningNodes).set({ position: sql`${learningNodes.position} - 1001`, updatedAt: now }).where(scope);
      }
      await tx.update(learningEnrollments).set({ resumeNodeId: fallback, updatedAt: now }).where(and(
        eq(learningEnrollments.guideId, guideId), inArray(learningEnrollments.resumeNodeId, ids),
      ));
      await tx.update(learningGuides).set({ structureRevision: guide.structureRevision + 1n, updatedAt: now })
        .where(and(eq(learningGuides.id, guideId), eq(learningGuides.ownerId, ownerId)));
      return nodeId;
    }, guideId);
  }

  async patchNode(ownerId: string, guideId: string, nodeId: string, input: PatchNodeInput): Promise<Receipt> {
    return this.execute(ownerId, input.operationId, [
      'node.patch', guideId, nodeId, input.expectedStructureRevision,
      input.title ?? null, input.required ?? null, input.completionMode ?? null,
    ], async (tx, now) => {
      const guide = await this.lockGuide(tx, ownerId, guideId);
      if (guide.deletedAt) throw learningError(404, 'NOT_FOUND', 'Guide was not found.');
      if (guide.archivedAt) throw learningError(409, 'LEARNING_LIFECYCLE_CONFLICT', 'Guide is archived.');
      if (guide.structureRevision.toString() !== input.expectedStructureRevision)
        throw learningError(409, 'LEARNING_REVISION_CONFLICT', 'Guide structure changed.');
      const scope = and(eq(learningNodes.guideId, guideId), eq(learningNodes.id, nodeId), isNull(learningNodes.deletedAt));
      const [node] = await tx.select().from(learningNodes).where(scope);
      if (!node) throw learningError(404, 'NOT_FOUND', 'Node was not found.');
      const title = input.title ?? node.title;
      const required = input.required ?? node.required;
      const completionMode = input.completionMode ?? node.completionMode;
      const requirementChanged = required !== node.required || completionMode !== node.completionMode;
      if (title === node.title && !requirementChanged) return nodeId;
      await tx.update(learningNodes).set({
        title, required, completionMode,
        requirementRevision: node.requirementRevision + (requirementChanged ? 1n : 0n),
        updatedAt: now,
      }).where(scope);
      await tx.update(learningGuides).set({ structureRevision: guide.structureRevision + 1n, updatedAt: now })
        .where(and(eq(learningGuides.id, guideId), eq(learningGuides.ownerId, ownerId)));
      return nodeId;
    }, guideId);
  }

  async moveNode(ownerId: string, guideId: string, nodeId: string, input: MoveNodeInput): Promise<Receipt> {
    return this.execute(ownerId, input.operationId, [
      'node.move', guideId, nodeId, input.expectedStructureRevision, input.parentId, input.beforeNodeId,
    ], async (tx, now) => {
      const guide = await this.lockGuide(tx, ownerId, guideId);
      if (guide.deletedAt) throw learningError(404, 'NOT_FOUND', 'Guide was not found.');
      if (guide.archivedAt) throw learningError(409, 'LEARNING_LIFECYCLE_CONFLICT', 'Guide is archived.');
      if (guide.structureRevision.toString() !== input.expectedStructureRevision)
        throw learningError(409, 'LEARNING_REVISION_CONFLICT', 'Guide structure changed.');
      const nodes = await tx.select().from(learningNodes).where(and(
        eq(learningNodes.guideId, guideId), isNull(learningNodes.deletedAt),
      )).limit(MAX_NODES + 1);
      const tree = buildHierarchy(nodes);
      const moving = tree.byId.get(nodeId);
      if (!moving) throw learningError(404, 'NOT_FOUND', 'Node was not found.');
      const plan = (() => {
        try {
          return planPlacement(nodes, nodeId, input.parentId, input.beforeNodeId);
        } catch (error) {
          if (error instanceof HierarchyError)
            throw learningError(409, 'LEARNING_INVALID_PLACEMENT', error.message);
          throw error;
        }
      })();
      if (plan.unchanged) return nodeId;
      const destination = [...plan.destination];
      destination.splice(plan.index, 0, moving);
      const placements = destination.map((node, position) => ({ id: node.id, parentId: input.parentId, position }));
      if (moving.parentId !== input.parentId)
        placements.push(...plan.source.map((node, position) => ({ id: node.id, parentId: moving.parentId, position })));
      const changed = placements.filter(placement => {
        const previous = tree.byId.get(placement.id);
        return previous?.parentId !== placement.parentId || previous.position !== placement.position;
      });
      const scope = and(eq(learningNodes.guideId, guideId), isNull(learningNodes.deletedAt),
        inArray(learningNodes.id, changed.map(node => node.id)));
      // Stage all changed positions before assigning any final position.
      await tx.update(learningNodes).set({ position: sql`${learningNodes.position} + 1000` }).where(scope);
      // Parameterized CASE expressions keep the number of statements bounded.
      await tx.update(learningNodes).set({
        parentId: sql`case ${learningNodes.id} ${sql.join(changed.map(node => sql`when ${node.id}::uuid then ${node.parentId}::uuid`), sql` `)} else ${learningNodes.parentId} end`,
        position: sql`case ${learningNodes.id} ${sql.join(changed.map(node => sql`when ${node.id}::uuid then ${node.position}::integer`), sql` `)} else ${learningNodes.position} end`,
        updatedAt: now,
      }).where(scope);
      await tx.update(learningGuides).set({ structureRevision: guide.structureRevision + 1n, updatedAt: now })
        .where(and(eq(learningGuides.id, guideId), eq(learningGuides.ownerId, ownerId)));
      return nodeId;
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

  async replaceNodeContent(
    ownerId: string,
    guideId: string,
    nodeId: string,
    input: ReplaceNodeContentInput,
  ): Promise<Receipt> {
    return this.execute(ownerId, input.operationId, [
      'node.content', guideId, nodeId, input.expectedContentRevision, input.blocks.length,
    ], async (tx, now) => {
      const guide = await this.lockGuide(tx, ownerId, guideId);
      if (guide.deletedAt) throw learningError(404, 'NOT_FOUND', 'Guide was not found.');
      if (guide.archivedAt) throw learningError(409, 'LEARNING_LIFECYCLE_CONFLICT', 'Guide is archived.');
      const [node] = await tx.select().from(learningNodes).where(and(
        eq(learningNodes.guideId, guideId),
        eq(learningNodes.id, nodeId),
        isNull(learningNodes.deletedAt),
      ));
      if (!node) throw learningError(404, 'NOT_FOUND', 'Node was not found.');
      if (node.contentRevision.toString() !== input.expectedContentRevision)
        throw learningError(409, 'LEARNING_REVISION_CONFLICT', 'Node content changed.');
      if (input.blocks.length > MAX_BLOCKS_PER_NODE)
        throw learningError(409, 'LEARNING_BLOCK_LIMIT', 'Block limit reached.');
      await tx.delete(learningBlocks).where(and(
        eq(learningBlocks.guideId, guideId),
        eq(learningBlocks.nodeId, nodeId),
      ));
      if (input.blocks.length) {
        const inserted = await tx
          .insert(learningBlocks)
          .values(
            input.blocks.map((block, position) => ({
              guideId,
              nodeId,
              position,
              type: block.type,
              payload: normalizeBlockPayload(block.type, block.payload),
              schemaVersion: 1,
            })),
          )
          .returning({ id: learningBlocks.id, position: learningBlocks.position, type: learningBlocks.type, payload: learningBlocks.payload });
        for (const row of inserted) {
          if (row.type === learningBlockType.Assessment) {
            const payload = row.payload as { assessmentId?: string };
            if (!payload.assessmentId) {
              throw learningError(400, 'VALIDATION_ERROR', 'Assessment block requires assessmentId.');
            }
            await assertLinkableGateAssessment(tx, guideId, payload.assessmentId);
            await tx.insert(learningAssessmentLinks).values({
              blockId: row.id,
              guideId,
              assessmentId: payload.assessmentId,
            });
          }
        }
      }
      await tx.update(learningNodes).set({
        contentRevision: node.contentRevision + 1n,
        updatedAt: now,
      }).where(and(eq(learningNodes.guideId, guideId), eq(learningNodes.id, nodeId)));
      return nodeId;
    }, guideId);
  }

  async setNodeCompletion(
    ownerId: string,
    guideId: string,
    nodeId: string,
    input: NodeCompletionInput,
  ): Promise<Receipt> {
    return this.execute(ownerId, input.operationId, [
      'node.completion', guideId, nodeId, input.complete,
    ], async (tx, now) => {
      const guide = await this.lockGuide(tx, ownerId, guideId);
      if (guide.deletedAt) throw learningError(404, 'NOT_FOUND', 'Guide was not found.');
      const [node] = await tx.select().from(learningNodes).where(and(
        eq(learningNodes.guideId, guideId),
        eq(learningNodes.id, nodeId),
        isNull(learningNodes.deletedAt),
      ));
      if (!node) throw learningError(404, 'NOT_FOUND', 'Node was not found.');
      if (node.completionMode === learningNodeCompletionMode.Gated) {
        throw learningError(409, 'GATED_COMPLETION', 'This step completes when required assessments pass.');
      }
      const [enrollment] = await tx.select().from(learningEnrollments).where(and(
        eq(learningEnrollments.guideId, guideId),
        eq(learningEnrollments.learnerId, ownerId),
      ));
      if (!enrollment) throw learningError(404, 'NOT_FOUND', 'Enrollment was not found.');
      if (input.complete) {
        await tx.insert(learningNodeProgress).values({
          enrollmentId: enrollment.id,
          guideId,
          nodeId,
          completedAt: now,
        }).onConflictDoNothing();
      } else {
        await tx.delete(learningNodeProgress).where(and(
          eq(learningNodeProgress.enrollmentId, enrollment.id),
          eq(learningNodeProgress.nodeId, nodeId),
        ));
      }
      await tx.update(learningEnrollments).set({ lastActivityAt: now, updatedAt: now })
        .where(eq(learningEnrollments.id, enrollment.id));
      return nodeId;
    }, guideId);
  }

  async importPortableGuide(ownerId: string, operationId: string, guide: PortableGuide): Promise<Receipt> {
    return this.execute(ownerId, operationId, ['import', guide.title, guide.nodes.length], async (tx, now) => {
      const [usage] = await tx.select({ total: count() }).from(learningGuides)
        .where(eq(learningGuides.ownerId, ownerId));
      if ((usage?.total ?? 0) >= MAX_GUIDES)
        throw learningError(409, 'LEARNING_GUIDE_LIMIT', 'Retained guide limit reached.');
      if (guide.nodes.length > MAX_NODES) throw learningError(409, 'LEARNING_NODE_LIMIT', 'Node limit exceeded.');
      const idByKey = new Map<string, string>();
      const pending = [...guide.nodes];
      const staged: { node: PortableGuide['nodes'][number]; parentId: string | null; position: number }[] = [];
      const positionCount = new Map<string | null, number>();
      while (pending.length) {
        const ready = pending.filter((node) => !node.parentLocalKey || idByKey.has(node.parentLocalKey));
        if (!ready.length) throw learningError(400, 'VALIDATION_ERROR', 'Invalid node parent references.');
        for (const node of ready) {
          const parentKey = node.parentLocalKey;
          const position = positionCount.get(parentKey) ?? 0;
          positionCount.set(parentKey, position + 1);
          const parentId = parentKey ? idByKey.get(parentKey) ?? null : null;
          const id = randomUUID();
          idByKey.set(node.localKey, id);
          staged.push({ node, parentId, position });
          pending.splice(pending.indexOf(node), 1);
        }
      }
      buildHierarchy(staged.map((row) => ({
        id: idByKey.get(row.node.localKey)!,
        parentId: row.parentId,
        position: row.position,
      })));
      const [inserted] = await tx.insert(learningGuides).values({
        ownerId,
        title: guide.title,
        description: guide.description,
      }).returning({ id: learningGuides.id });
      if (!inserted) throw new Error('Guide insert failed.');
      const guideId = inserted.id;
      await tx.insert(learningEnrollments).values({ guideId, learnerId: ownerId });
      for (const row of staged) {
        const id = idByKey.get(row.node.localKey)!;
        await tx.insert(learningNodes).values({
          id,
          guideId,
          parentId: row.parentId,
          title: row.node.title,
          position: row.position,
          required: row.node.required,
          completionMode: row.node.completionMode,
        });
        if (row.node.blocks.length) {
          await tx.insert(learningBlocks).values(
            row.node.blocks.map((block, position) => ({
              guideId,
              nodeId: id,
              position,
              type: block.type,
              payload: normalizeBlockPayload(block.type, block.payload),
              schemaVersion: 1,
            })),
          );
        }
      }
      await tx.update(learningGuides).set({
        structureRevision: sql`${learningGuides.structureRevision} + 1`,
        updatedAt: now,
      }).where(eq(learningGuides.id, guideId));
      return guideId;
    });
  }
}
