import type { ProgressSummary } from './schemas/learning-blocks.schema.js';

type NodeRow = { id: string; required: boolean };

export function summarizeProgress(nodes: NodeRow[], completedIds: ReadonlySet<string>): ProgressSummary {
  const required = nodes.filter((node) => node.required);
  const total = required.length;
  const completed = required.filter((node) => completedIds.has(node.id)).length;
  const percent = total === 0 ? null : Math.floor((completed / total) * 100);
  return { completedRequired: completed, totalRequired: total, percent };
}