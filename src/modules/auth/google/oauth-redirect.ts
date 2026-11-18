import { oauthReturnPath } from './oauth-return-path.js';

export function frontendLoginErrorUrl(origin: string, code: string): string {
  const url = new URL('/login', origin);
  url.searchParams.set('oauth_error', code);
  return url.toString();
}

export function frontendAppUrl(origin: string, next?: string): string {
  const path = oauthReturnPath(next) ?? '/app';
  return `${origin}${path}`;
}

export function frontendProfileUrl(
  origin: string,
  params?: { oauthError?: string; googleLinked?: boolean },
): string {
  const url = new URL('/app/profile', origin);
  if (params?.oauthError) url.searchParams.set('oauth_error', params.oauthError);
  if (params?.googleLinked) url.searchParams.set('google_linked', '1');
  return url.toString();
}