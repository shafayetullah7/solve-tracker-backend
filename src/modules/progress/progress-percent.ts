/** FR-05: integer completion percentage; 0 when a topic has no problems. */
export function percentComplete(solved: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((solved / total) * 100);
}