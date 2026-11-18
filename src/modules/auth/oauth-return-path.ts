const AUTH_ONLY_PATHS = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
]);

function isAllowedAppPath(path: string): boolean {
  if (path === '/' || path === '/account' || path.startsWith('/account/'))
    return true;
  if (path === '/app' || path.startsWith('/app/')) return true;
  return false;
}

/** Mirrors frontend `safeReturnPath` for OAuth `next` stored in state cookies. */
export function oauthReturnPath(
  value: string | null | undefined,
): string | undefined {
  if (value == null || value === '') return undefined;
  const trimmed = value.trim();
  const qIndex = trimmed.indexOf('?');
  const path = (qIndex === -1 ? trimmed : trimmed.slice(0, qIndex)) || '';
  const query = qIndex === -1 ? '' : trimmed.slice(qIndex);
  if (!path.startsWith('/') || path.startsWith('//')) return undefined;
  if (path.includes(':')) return undefined;
  const lower = trimmed.toLowerCase();
  if (lower.includes('http') || lower.startsWith('javascript')) return undefined;
  if (AUTH_ONLY_PATHS.has(path)) return undefined;
  if (!isAllowedAppPath(path)) return undefined;
  return path + query;
}