import type { ProblemLinkStatus } from '../problems/problems-learning-read.service.js';

export type ProblemStatusMap = Map<string, { problemId: string; status: ProblemLinkStatus }>;

export function assessmentsPassForNode(
  assessmentIds: readonly string[],
  thresholds: Map<string, number>,
  bestScores: Map<string, number>,
): boolean {
  if (assessmentIds.length === 0) return true;
  for (const assessmentId of assessmentIds) {
    const passing = thresholds.get(assessmentId);
    if (passing === undefined) return false;
    const best = bestScores.get(assessmentId) ?? null;
    if (best === null || best < passing) return false;
  }
  return true;
}

export function problemsPassForNode(
  normalizedUrls: readonly string[],
  statusMap: ProblemStatusMap,
): boolean {
  if (normalizedUrls.length === 0) return true;
  for (const url of normalizedUrls) {
    const row = statusMap.get(url);
    if (!row || row.status !== 'solved') return false;
  }
  return true;
}

export function resolveGatedCompleteNodeIdsFromData(
  byNodeAssessments: Map<string, string[]>,
  byNodeProblems: Map<string, string[]>,
  thresholds: Map<string, number>,
  bestScores: Map<string, number>,
  problemStatuses: ProblemStatusMap,
): Set<string> {
  const candidateNodeIds = new Set<string>([
    ...byNodeAssessments.keys(),
    ...byNodeProblems.keys(),
  ]);
  const complete = new Set<string>();
  for (const nodeId of candidateNodeIds) {
    const assessmentIds = byNodeAssessments.get(nodeId) ?? [];
    const problemUrls = byNodeProblems.get(nodeId) ?? [];
    if (assessmentIds.length === 0 && problemUrls.length === 0) continue;
    const assessmentsOk = assessmentsPassForNode(assessmentIds, thresholds, bestScores);
    const problemsOk = problemsPassForNode(problemUrls, problemStatuses);
    if (assessmentsOk && problemsOk) complete.add(nodeId);
  }
  return complete;
}

export function groupAssessmentLinksByNode(
  rows: readonly { nodeId: string; assessmentId: string }[],
): Map<string, string[]> {
  const byNode = new Map<string, string[]>();
  for (const row of rows) {
    const list = byNode.get(row.nodeId) ?? [];
    list.push(row.assessmentId);
    byNode.set(row.nodeId, list);
  }
  return byNode;
}

export function groupProblemLinksByNode(
  rows: readonly { nodeId: string; normalizedUrl: string }[],
): Map<string, string[]> {
  const byNode = new Map<string, string[]>();
  for (const row of rows) {
    const list = byNode.get(row.nodeId) ?? [];
    list.push(row.normalizedUrl);
    byNode.set(row.nodeId, list);
  }
  return byNode;
}

export function collectAssessmentIds(
  rows: readonly { assessmentId: string }[],
): string[] {
  return rows.map((row) => row.assessmentId);
}