import { measureCodePoints } from '../../common/unicode.js';
import { PROBLEM_URL_MAX } from './problem-fields.js';

export class ProblemUrlError extends Error {
  constructor(
    readonly code: 'EMPTY' | 'TOO_LONG' | 'INVALID' | 'UNSUPPORTED_SCHEME',
  ) {
    const messages: Record<ProblemUrlError['code'], string> = {
      EMPTY: 'Problem URL must not be empty.',
      TOO_LONG: `Problem URL must contain at most ${PROBLEM_URL_MAX} characters.`,
      INVALID: 'Problem URL is not valid.',
      UNSUPPORTED_SCHEME: 'Problem URL must use http or https.',
    };
    super(messages[code]);
  }
}

function withoutFragment(parsed: URL): URL {
  const copy = new URL(parsed.href);
  copy.hash = '';
  return copy;
}

function clearDefaultPort(parsed: URL): void {
  if (parsed.protocol === 'http:' && parsed.port === '80') parsed.port = '';
  if (parsed.protocol === 'https:' && parsed.port === '443') parsed.port = '';
}

/** FR-06: trim, http(s) only, lowercase scheme/host, strip fragment; preserve path and query. */
export function prepareProblemUrl(raw: string): {
  url: string;
  normalizedUrl: string;
} {
  const trimmed = raw.trim();
  const length = measureCodePoints(trimmed);
  if (length < 1) throw new ProblemUrlError('EMPTY');
  if (length > PROBLEM_URL_MAX) throw new ProblemUrlError('TOO_LONG');

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new ProblemUrlError('INVALID');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
    throw new ProblemUrlError('UNSUPPORTED_SCHEME');
  if (!parsed.hostname) throw new ProblemUrlError('INVALID');

  const display = withoutFragment(parsed);
  const url = display.toString();

  const normalized = withoutFragment(parsed);
  normalized.protocol = normalized.protocol.toLowerCase();
  normalized.hostname = normalized.hostname.toLowerCase();
  clearDefaultPort(normalized);
  const normalizedUrl = normalized.toString();

  return { url, normalizedUrl };
}