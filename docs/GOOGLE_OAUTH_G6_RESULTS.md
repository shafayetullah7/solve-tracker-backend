# GOOGLE-AUTH G6 — OpenAPI, ops, documentation (results)

**Status:** complete (2026-11-18).  
**Plan:** [GOOGLE_OAUTH_PHASED_PLAN.md](GOOGLE_OAUTH_PHASED_PLAN.md) § G6.

## OpenAPI / client

- Regenerated [`openapi.json`](../openapi.json): `/auth/session` includes `account`; added `/auth/set-password` (nine documented `/auth/*` paths; OAuth redirects remain excluded).
- Frontend [`api:generate`](../../solve-tracker-frontend/src/lib/api/generated/backend.d.ts) — `AuthController_session`, `AuthController_setPassword`.
- [`auth.api.ts`](../../solve-tracker-frontend/src/lib/api/modules/auth.api.ts) — types from generated operations; `unlinkGoogle` stays manual.

## Documentation

- Master reference: [GOOGLE_OAUTH_RESULTS.md](GOOGLE_OAUTH_RESULTS.md) (redirect table, checklist, future email copy).
- Production: [PRODUCTION.md](../PRODUCTION.md) § Google OAuth.
- README auth list + link to RESULTS; `.env.example` pointer updated.
- [AUTH_CONVENTIONS.md](../../solve-tracker-frontend/AUTH_CONVENTIONS.md) links RESULTS.

## Product copy and privacy

- `GOOGLE_PRACTICE_LOGOUT_NOTE` in [`oauth-error-copy.ts`](../../solve-tracker-frontend/src/lib/auth/oauth-error-copy.ts) on login, register, profile connected accounts.
- Landing privacy bullet for Google as identity provider ([`landing-copy.ts`](../../solve-tracker-frontend/src/components/landing/landing-copy.ts)).

## Verification

| Command | Result |
| --- | --- |
| `cd solve-tracker-backend && pnpm api:check` | OpenAPI snapshot matches export |
| `cd solve-tracker-frontend && pnpm api:check` | Generated types match |
| `cd solve-tracker-frontend && pnpm check` | Vitest + typecheck |
| `pnpm verify:platform-api` | Unchanged catalog gate |
| `TEST_DATABASE_URL=…/_test pnpm test:auth:integration` | Nine auth paths + session `account` in OpenAPI doc |

## Next phase

**G7** — [GOOGLE_OAUTH_G7_RESULTS.md](GOOGLE_OAUTH_G7_RESULTS.md).