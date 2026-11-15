export type ProblemCompletionState = {
  status: 'solved' | 'unsolved';
  solvedAt: Date | null;
};

export type ProblemCompletionPatch = {
  status: 'solved' | 'unsolved';
  solvedAt: Date | null;
};

/** FR-03: derive status/solvedAt patch for PATCH; null = no completion change. */
export function applyCompletionTransition(
  current: ProblemCompletionState,
  next: 'solved' | 'unsolved',
  now: Date,
): ProblemCompletionPatch | null {
  if (next === 'unsolved' && current.status === 'unsolved') return null;
  if (next === 'solved' && current.status === 'unsolved') {
    return { status: 'solved', solvedAt: now };
  }
  if (next === 'solved' && current.status === 'solved') {
    return { status: 'solved', solvedAt: current.solvedAt };
  }
  return { status: 'unsolved', solvedAt: null };
}