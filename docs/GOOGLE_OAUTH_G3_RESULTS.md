# GOOGLE-AUTH G3 — Auth controller and session issuance (results)

**Status:** complete (2026-11-18).  
**Plan:** [GOOGLE_OAUTH_PHASED_PLAN.md](GOOGLE_OAUTH_PHASED_PLAN.md) § G3.

## Routes

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/auth/google` | 404 when disabled; rate-limited; sets state cookie; 302 to Google authorize URL |
| `GET` | `/auth/google/callback` | Validates state/PKCE; exchanges code; `signInWithGoogle`; sets Practice cookies; 302 to `FRONTEND_ORIGIN` + safe `next` (default `/app`) |

OpenAPI: `@ApiExcludeEndpoint()` on both (auth path count stays **8**).

## AuthService

- **`establishOAuthSession(userId, previousRefresh?)`** — same session insert + JWT cookies as password login.
- **`signInWithGoogle(profile, previousRefresh?)`** — G0 linking matrix (existing `sub`, auto-link email, or Google-only register).

Errors redirect to `{FRONTEND_ORIGIN}/login?oauth_error=<code>` using `GoogleOAuthErrorCodes` (+ `OAUTH_ACCOUNT_CONFLICT`).

## Rate limits

`/auth/google` and `/auth/google/callback`: **30 requests / 15 min** per IP (`AuthSecurityGuard` + `httpResourcePath`).

## Verification

| Command | Result |
| --- | --- |
| `pnpm test` | Pass |
| `TEST_DATABASE_URL=…/_test pnpm test:google-oauth:auth` | 5 checks |
| `TEST_DATABASE_URL=…/_test pnpm test:google-oauth:integration` | 8 checks (mocked Google HTTP) |
| `TEST_DATABASE_URL=…/_test pnpm test:auth:integration` | 38 assertions (regression) |

## Manual smoke (optional)

1. Set `GOOGLE_OAUTH_ENABLED=true` and real Google credentials.
2. Browser: `GET {FRONTEND_ORIGIN}/api/auth/google?next=/app` → Google consent → lands on `/app` with cookies.

## Next phase

**G4** — complete; see [GOOGLE_OAUTH_G4_RESULTS.md](GOOGLE_OAUTH_G4_RESULTS.md). **G5** optional — Profile link.