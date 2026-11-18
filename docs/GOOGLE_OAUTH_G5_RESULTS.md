# GOOGLE-AUTH G5 — Account linking and profile auth methods (results)

**Status:** complete (2026-11-18).  
**Plan:** [GOOGLE_OAUTH_PHASED_PLAN.md](GOOGLE_OAUTH_PHASED_PLAN.md) § G5.

**Distinction from G0:** Login OAuth still uses `signInWithGoogle` (auto-link by verified email). **Profile link** (`mode=link`) attaches Google `sub` only to the signed-in user; no email-based user switching.

## Backend rules

| Flow | Behavior |
| --- | --- |
| `GET /auth/google?mode=link` | Requires access cookie; signed state carries `linkUserId`; rejects if Google already linked |
| Callback `mode=link` | `linkGoogleToUser`; keeps existing session cookies; redirect `/app/profile?google_linked=1` or `oauth_error` |
| `DELETE /auth/google/link` | Unlink when `password_hash` is set (`PASSWORD_REQUIRED_TO_UNLINK` otherwise) |
| `POST /auth/set-password` | Google-only (`password_hash` null); **does not** revoke all sessions (unlike change-password) |
| `GET /auth/session` | Adds `account: { googleLinked, hasPassword }` |

## OAuth state

`OAuthStateService` payload: `mode?: 'login' | 'link'`, `linkUserId?: string`.

## Frontend

| Piece | Role |
| --- | --- |
| `googleOAuthLinkHref` | Profile link start (`mode=link`) |
| `ProfileConnectedAccountsPanel` | Link / unlink / set-password CTA |
| `ProfileSetPasswordDialog` | Initial password for Google-only users |
| `AuthProvider` | `account()`, `reloadSession()` from session probe |
| Profile | OAuth banners via `oauth_error` / `google_linked`; change-password only when `hasPassword` |

## Errors (profile)

Profile OAuth failures redirect to `/app/profile?oauth_error=<code>` (login flow unchanged). Reuse `oauth-error-copy.ts`.

## Verification

| Command | Expectation |
| --- | --- |
| `TEST_DATABASE_URL=…/_test pnpm test:google-oauth:auth` | **11** checks (link, conflict, set-password, unlink) |
| `TEST_DATABASE_URL=…/_test pnpm test:google-oauth:integration` | **13** checks (session flags, set-password, unlink, `mode=link`) |
| `cd solve-tracker-frontend && pnpm check` | **367** tests |

OpenAPI: `/auth/set-password` documented; OAuth routes remain `@ApiExcludeEndpoint()`. Regenerate client types in **G6**.

## Deferred

- Email on first link (G0 backlog → G6 copy).
- Email notification on profile link.

## Next phase

**G6** — [GOOGLE_OAUTH_G6_RESULTS.md](GOOGLE_OAUTH_G6_RESULTS.md).