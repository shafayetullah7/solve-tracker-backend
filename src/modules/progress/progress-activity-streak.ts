import { addUtcDays, formatUtcDate } from './progress-activity-weeks.js';

export type SolveStreak = {
  currentDays: number;
  lastSolveDate: string | null;
};

function parseUtcDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

/** Distinct ISO solve days (YYYY-MM-DD), any order. */
export function computeSolveStreak(
  distinctSolveDates: string[],
  now: Date = new Date(),
): SolveStreak {
  if (distinctSolveDates.length === 0) {
    return { currentDays: 0, lastSolveDate: null };
  }

  const set = new Set(distinctSolveDates);
  const sorted = [...set].sort();
  const lastSolveDate = sorted.at(-1)!;

  const today = formatUtcDate(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())),
  );
  const yesterday = formatUtcDate(addUtcDays(parseUtcDate(today), -1));

  if (lastSolveDate !== today && lastSolveDate !== yesterday) {
    return { currentDays: 0, lastSolveDate };
  }

  let streak = 0;
  let cursor = parseUtcDate(lastSolveDate);
  while (set.has(formatUtcDate(cursor))) {
    streak += 1;
    cursor = addUtcDays(cursor, -1);
  }

  return { currentDays: streak, lastSolveDate };
}