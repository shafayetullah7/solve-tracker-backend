import { z } from 'zod';
import { learningBlockType } from '../../database/schema/learning/learning-block-type.enum.js';
import type { ProblemLinkStatus } from '../problems/problems-learning-read.service.js';
import type { BlockResponse } from './schemas/learning-blocks.schema.js';

export const PROBLEM_RESOLUTION_VALUES = [
  'unresolved',
  'linked_unsolved',
  'solved',
] as const;

export const problemResolutionSchema = z.enum(PROBLEM_RESOLUTION_VALUES);

export type ProblemResolution = (typeof PROBLEM_RESOLUTION_VALUES)[number];

export const problemBlockSummarySchema = z.strictObject({
  blockId: z.uuid(),
  problemResolution: problemResolutionSchema,
  problemId: z.uuid().optional(),
});

export type ProblemBlockSummary = z.infer<typeof problemBlockSummarySchema>;

export type ProblemStatusMap = Map<string, { problemId: string; status: ProblemLinkStatus }>;

export type GuideProblemLinkRow = {
  blockId: string;
  nodeId: string;
  normalizedUrl: string;
};

export function toProblemResolution(
  statusMap: ProblemStatusMap,
  normalizedUrl: string,
): Pick<ProblemBlockSummary, 'problemResolution' | 'problemId'> {
  const row = statusMap.get(normalizedUrl);
  if (!row) return { problemResolution: 'unresolved' };
  if (row.status === 'solved') {
    return { problemResolution: 'solved', problemId: row.problemId };
  }
  return { problemResolution: 'linked_unsolved', problemId: row.problemId };
}

export function buildProblemSummaries(
  links: readonly GuideProblemLinkRow[],
  statusMap: ProblemStatusMap,
): ProblemBlockSummary[] {
  return links.map((link) => ({
    blockId: link.blockId,
    ...toProblemResolution(statusMap, link.normalizedUrl),
  }));
}

export function enrichBlocksWithProblemResolution(
  blocks: BlockResponse[],
  linkByBlockId: Map<string, string>,
  statusMap: ProblemStatusMap,
): BlockResponse[] {
  return blocks.map((block) => {
    if (block.type !== learningBlockType.Problem) return block;
    const normalizedUrl = linkByBlockId.get(block.id);
    if (!normalizedUrl) return block;
    const resolution = toProblemResolution(statusMap, normalizedUrl);
    return { ...block, ...resolution };
  });
}

export function groupProblemSummariesByNodeId(
  links: readonly GuideProblemLinkRow[],
  statusMap: ProblemStatusMap,
): Map<string, ProblemBlockSummary[]> {
  const byNode = new Map<string, ProblemBlockSummary[]>();
  for (const link of links) {
    const summary: ProblemBlockSummary = {
      blockId: link.blockId,
      ...toProblemResolution(statusMap, link.normalizedUrl),
    };
    const list = byNode.get(link.nodeId) ?? [];
    list.push(summary);
    byNode.set(link.nodeId, list);
  }
  return byNode;
}