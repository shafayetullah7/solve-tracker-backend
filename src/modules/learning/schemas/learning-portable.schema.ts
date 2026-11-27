import { z } from 'zod';
import {
  WRITABLE_LEARNING_IMPORT_SOURCE_KINDS,
  learningImportSourceKind,
} from '../../../database/schema/learning/learning-import-source-kind.enum.js';
import { learningBlockType } from '../../../database/schema/learning/learning-block-type.enum.js';
import { WRITABLE_LEARNING_NODE_COMPLETION_MODES } from '../../../database/schema/learning/learning-node-completion-mode.enum.js';

export const PORTABLE_SCHEMA_VERSION = 1;

const portableBlockSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal(learningBlockType.Text),
    payload: z.strictObject({ body: z.string().max(64_000) }),
  }),
  z.strictObject({
    type: z.literal(learningBlockType.Code),
    payload: z.strictObject({ language: z.string().max(64).optional(), body: z.string().max(64_000) }),
  }),
  z.strictObject({
    type: z.literal(learningBlockType.Checklist),
    payload: z.strictObject({
      items: z.array(z.strictObject({ id: z.string().max(64), label: z.string().max(500) })).max(100),
    }),
  }),
  z.strictObject({
    type: z.literal(learningBlockType.Link),
    payload: z.strictObject({ url: z.string().max(2048), label: z.string().max(500) }),
  }),
]);

const portableNodeSchema = z.strictObject({
  localKey: z.string().min(1).max(64),
  parentLocalKey: z.string().max(64).nullable(),
  title: z.string().min(1).max(200),
  required: z.boolean(),
  completionMode: z.enum(WRITABLE_LEARNING_NODE_COMPLETION_MODES),
  blocks: z.array(portableBlockSchema).max(200),
});

export const portableGuideSchema = z.strictObject({
  schemaVersion: z.literal(PORTABLE_SCHEMA_VERSION),
  title: z.string().min(1).max(200),
  description: z.string().max(4000).default(''),
  nodes: z.array(portableNodeSchema).max(2000),
  mediaManifest: z.array(z.strictObject({
    localKey: z.string(),
    missing: z.boolean().optional(),
  })).max(1000).default([]),
});

export type PortableGuide = z.infer<typeof portableGuideSchema>;

export const importPreviewSchema = z.strictObject({
  format: z.enum(WRITABLE_LEARNING_IMPORT_SOURCE_KINDS),
  content: z.string().max(8_388_608),
});

export const importCommitSchema = z.strictObject({
  operationId: z.uuid(),
});

export const guideExportQuerySchema = z.strictObject({
  format: z
    .enum(WRITABLE_LEARNING_IMPORT_SOURCE_KINDS)
    .default(learningImportSourceKind.Json),
});