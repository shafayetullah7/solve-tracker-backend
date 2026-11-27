/** Rate limits — provisional; see docs/learning/SECURITY_RECOVERY_ARCHITECTURE.md */

export const RATE_LIMIT_IMPORT_PER_HOUR = 10;
export const RATE_LIMIT_ATTEMPT_START_PER_HOUR = 30;

export const RATE_LIMIT_IMPORT_WINDOW_MS = 3_600_000;
export const RATE_LIMIT_ATTEMPT_START_WINDOW_MS = 3_600_000;

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function rateLimitImportPerHour(): number {
  return envInt('LEARNING_RATE_LIMIT_IMPORT_PER_HOUR', RATE_LIMIT_IMPORT_PER_HOUR);
}

export function rateLimitAttemptStartPerHour(): number {
  return envInt('LEARNING_RATE_LIMIT_ATTEMPT_START_PER_HOUR', RATE_LIMIT_ATTEMPT_START_PER_HOUR);
}