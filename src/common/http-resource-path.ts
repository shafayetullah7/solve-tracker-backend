import type { Request } from 'express';

/** Normalized mount path for CSRF and rate-limit rules (no trailing slash). */
export function httpResourcePath(req: Request): string {
  const base = req.baseUrl ?? '';
  const path = req.path ?? '';
  const combined = `${base}${path}`;
  if (combined === '' || combined === '/') return '/';
  return combined.replace(/\/+$/, '');
}