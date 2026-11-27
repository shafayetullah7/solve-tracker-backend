import { createHash, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import { learningGuides, learningImportPreviews, learningNodes } from '../../database/schema/index.js';
import {
  learningBlockType,
  type LearningBlockType,
} from '../../database/schema/learning/learning-block-type.enum.js';
import { WRITABLE_LEARNING_NODE_COMPLETION_MODES } from '../../database/schema/learning/learning-node-completion-mode.enum.js';
import { WRITABLE_LEARNING_IMPORT_SOURCE_KINDS } from '../../database/schema/learning/learning-import-source-kind.enum.js';
import { LearningGuideMutationsRepository } from './learning-guide-mutations.repository.js';
import { LearningGuidesRepository } from './learning-guides.repository.js';
import { learningError } from './learning.errors.js';
import { buildHierarchy } from './learning-hierarchy.js';
import { outlineToPortable, parseMarkdownOutline, portableToMarkdown } from './learning-markdown-outline.js';
import {
  importCommitSchema,
  importPreviewSchema,
  portableGuideSchema,
  type PortableGuide,
  PORTABLE_SCHEMA_VERSION,
} from './schemas/learning-portable.schema.js';
import { toBlockResponse } from './schemas/learning-blocks.schema.js';

const PREVIEW_TTL_MS = 60 * 60 * 1000;
const MAX_ACTIVE_PREVIEWS = 2;

@Injectable()
export class LearningPortabilityService {
  constructor(
    private readonly database: DatabaseService,
    private readonly repository: LearningGuidesRepository,
    private readonly mutations: LearningGuideMutationsRepository,
  ) {}

  async exportGuide(
    ownerId: string,
    guideId: string,
    format: (typeof WRITABLE_LEARNING_IMPORT_SOURCE_KINDS)[number],
  ) {
    const guide = await this.repository.findOwned(ownerId, guideId);
    if (!guide) throw learningError(404, 'NOT_FOUND', 'Guide was not found.');
    const tree = await this.repository.findOwnedTree(ownerId, guideId);
    const nodes = tree
      .map((row) => row.node)
      .filter((node): node is NonNullable<typeof node> => node !== null && node.id !== null);
    const hierarchy = buildHierarchy(nodes);
    const portableNodes: PortableGuide['nodes'] = [];
    for (const node of hierarchy.preorder) {
      const content = await this.repository.findNodeBlocks(ownerId, guideId, node.id);
      const blocks = (content?.blocks ?? []).map((row) => {
        const response = toBlockResponse({
          id: row.id,
          position: row.position,
          type: row.type as LearningBlockType,
          payload: row.payload,
          schemaVersion: row.schemaVersion,
        });
        if (response.type === learningBlockType.Problem) {
          const payload = response.payload as { url?: string; label?: string };
          return {
            type: learningBlockType.Problem,
            payload: {
              url: typeof payload.url === 'string' ? payload.url : '',
              ...(typeof payload.label === 'string' && payload.label.trim().length > 0
                ? { label: payload.label.trim() }
                : {}),
            },
          };
        }
        return { type: response.type, payload: response.payload } as PortableGuide['nodes'][number]['blocks'][number];
      });
      portableNodes.push({
        localKey: node.id,
        parentLocalKey: node.parentId,
        title: node.title,
        required: node.required,
        completionMode:
          node.completionMode as (typeof WRITABLE_LEARNING_NODE_COMPLETION_MODES)[number],
        blocks,
      });
    }
    const portable = portableGuideSchema.parse({
      schemaVersion: PORTABLE_SCHEMA_VERSION,
      title: guide.title,
      description: guide.description,
      nodes: portableNodes,
      mediaManifest: [],
    });
    if (format === 'json') return { format, body: portable };
    return { format, body: portableToMarkdown(portable) };
  }

  async previewImport(ownerId: string, raw: unknown) {
    const input = importPreviewSchema.parse(raw);
    const hash = createHash('sha256').update(input.content).digest('hex');
    let normalized: PortableGuide;
    const warnings: string[] = [];
    if (input.format === 'json') {
      try {
        normalized = portableGuideSchema.parse(JSON.parse(input.content));
      } catch {
        throw learningError(400, 'VALIDATION_ERROR', 'Invalid portable JSON.');
      }
    } else {
      const parsed = parseMarkdownOutline(input.content);
      warnings.push(...parsed.warnings);
      const title = parsed.nodes[0]?.title ?? 'Imported guide';
      normalized = portableGuideSchema.parse(outlineToPortable(title, parsed.nodes));
    }
    const active = await this.database.db.select({ id: learningImportPreviews.id })
      .from(learningImportPreviews)
      .where(and(eq(learningImportPreviews.ownerId, ownerId), gt(learningImportPreviews.expiresAt, new Date())));
    if (active.length >= MAX_ACTIVE_PREVIEWS) {
      throw learningError(409, 'LEARNING_IMPORT_LIMIT', 'Too many active import previews.');
    }
    const expiresAt = new Date(Date.now() + PREVIEW_TTL_MS);
    const [row] = await this.database.db.insert(learningImportPreviews).values({
      ownerId,
      sourceKind: input.format,
      sourceSha256: hash,
      normalizedPayload: normalized,
      warnings,
      expiresAt,
    }).returning({ id: learningImportPreviews.id });
    if (!row) throw new Error('Import preview insert failed.');
    return {
      importId: row.id,
      guidePreview: {
        title: normalized.title,
        nodeCount: normalized.nodes.length,
        nodes: normalized.nodes.map((n) => ({
          localKey: n.localKey,
          parentLocalKey: n.parentLocalKey,
          title: n.title,
        })),
      },
      warnings,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async commitImport(ownerId: string, importId: string, raw: unknown) {
    const input = importCommitSchema.parse(raw);
    const [preview] = await this.database.db.select().from(learningImportPreviews)
      .where(and(
        eq(learningImportPreviews.id, importId),
        eq(learningImportPreviews.ownerId, ownerId),
        gt(learningImportPreviews.expiresAt, new Date()),
      ));
    if (!preview) throw learningError(404, 'NOT_FOUND', 'Import preview was not found or expired.');
    const guide = portableGuideSchema.parse(preview.normalizedPayload);
    const receipt = await this.mutations.importPortableGuide(ownerId, input.operationId, guide);
    await this.database.db.delete(learningImportPreviews).where(eq(learningImportPreviews.id, importId));
    return receipt;
  }

  async copyGuide(ownerId: string, guideId: string, operationId: string) {
    const exported = await this.exportGuide(ownerId, guideId, 'json');
    if (exported.format !== 'json') throw new Error('Expected JSON export.');
    const clone = portableGuideSchema.parse({
      ...exported.body,
      title: `${exported.body.title} (copy)`,
    });
    return this.mutations.importPortableGuide(ownerId, operationId, clone);
  }
}