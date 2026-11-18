/** Six buckets from easy (index 0) to hard (index 5) for public topic headers. */

export const DIFFICULTY_HISTOGRAM_BUCKETS = 6;

export type HistogramProblemInput = {
  difficulty: string | null;
  rating: number | null;
};

function difficultyScore(input: HistogramProblemInput): number {
  if (input.rating != null) {
    const clamped = Math.min(4000, Math.max(800, input.rating));
    return ((clamped - 800) / 3200) * 100;
  }
  const label = (input.difficulty ?? '').toLowerCase();
  if (label.includes('easy')) return 12;
  if (label.includes('medium') || label.includes('med')) return 50;
  if (label.includes('hard')) return 88;
  return 50;
}

export function bucketIndexForProblem(input: HistogramProblemInput): number {
  const score = difficultyScore(input);
  const index = Math.floor((score / 100) * DIFFICULTY_HISTOGRAM_BUCKETS);
  return Math.min(DIFFICULTY_HISTOGRAM_BUCKETS - 1, Math.max(0, index));
}

export function buildDifficultyHistogram(
  rows: HistogramProblemInput[],
): number[] {
  const buckets = Array.from(
    { length: DIFFICULTY_HISTOGRAM_BUCKETS },
    () => 0,
  );
  for (const row of rows) {
    buckets[bucketIndexForProblem(row)] += 1;
  }
  return buckets;
}