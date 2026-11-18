import { HUB_LIST_RANK_TOP } from './discover.config.js';

export type PublicListRankRow = {
  topicId: string;
  ownerUserId: string;
  handle: string;
  name: string;
  description: string;
  total: number;
  solved: number;
  copies30d: number;
};

export function publicListScore(row: PublicListRankRow): number {
  const completion = row.total > 0 ? row.solved / row.total : 0;
  const hasDescription = row.description.trim().length > 0 ? 1 : 0;
  return (
    2 * Math.log(1 + row.copies30d) +
    Math.log(1 + row.total) +
    0.5 * completion +
    0.5 * hasDescription
  );
}

export function rankPublicLists(
  rows: PublicListRankRow[],
  limit = HUB_LIST_RANK_TOP,
): PublicListRankRow[] {
  const sorted = [...rows].sort((a, b) => {
    const d = publicListScore(b) - publicListScore(a);
    if (d !== 0) return d;
    return a.handle.localeCompare(b.handle);
  });
  const seen = new Set<string>();
  const out: PublicListRankRow[] = [];
  for (const row of sorted) {
    if (seen.has(row.ownerUserId)) continue;
    seen.add(row.ownerUserId);
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}

export function meetsKAnonymity(count: number, k: number): boolean {
  return count >= k;
}

export type PatternRow = { normalizedName: string; name: string; percent: number };

export function topPatternRows(
  rows: PatternRow[],
  limit: number,
  cohortSize: number,
  k: number,
): PatternRow[] {
  if (!meetsKAnonymity(cohortSize, k)) return [];
  return rows
    .sort((a, b) => b.percent - a.percent || a.normalizedName.localeCompare(b.normalizedName))
    .slice(0, limit);
}