# GOOGLE-AUTH G4 — Frontend (results)

**Status:** complete (2026-11-18).  
**Plan:** [GOOGLE_OAUTH_PHASED_PLAN.md](GOOGLE_OAUTH_PHASED_PLAN.md) § G4.

## Feature flag

- `VITE_GOOGLE_OAUTH_ENABLED=true` at **build** time ([`.env.example`](../../solve-tracker-frontend/.env.example)).
- Must match backend `GOOGLE_OAUTH_ENABLED` in local dev.

## UI

| Location | Behavior |
| --- | --- |
| `/login` | `Continue with Google` link → `/api/auth/google?next=`; `oauth_error` alerts |
| `/register` | Same link; `returnTo` from `?next=` or `/app` |

Components: `ContinueWithGoogle`, `AuthOAuthDivider`.

## Library

- [`google-oauth.ts`](../../solve-tracker-frontend/src/lib/auth/google-oauth.ts) — `isGoogleOAuthEnabled`, `googleOAuthStartHref`
- [`oauth-error-copy.ts`](../../solve-tracker-frontend/src/lib/auth/oauth-error-copy.ts) — maps backend `oauth_error` codes

## Docs

- [AUTH_CONVENTIONS.md](../../solve-tracker-frontend/AUTH_CONVENTIONS.md) — Google OAuth (server redirect) section
- [`auth-gate.ts`](../../solve-tracker-frontend/config/auth-gate.ts) — comment: `/api` never SSR (includes OAuth)

## Verification

`cd solve-tracker-frontend && pnpm check` — **363** tests pass (includes `google-oauth.test.ts`, `oauth-error-copy.test.ts`, extended `auth-gate.test.ts`).

## Manual smoke

1. Backend + frontend: `GOOGLE_OAUTH_ENABLED=true` and `VITE_GOOGLE_OAUTH_ENABLED=true`, rebuild frontend.
2. Login → Continue with Google → consent → land on `/app` with session.

## Next phase

**G5** — Profile link/unlink Google ([GOOGLE_OAUTH_G5_RESULTS.md](GOOGLE_OAUTH_G5_RESULTS.md)).