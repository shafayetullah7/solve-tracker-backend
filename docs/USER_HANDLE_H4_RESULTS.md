# USER-HANDLE H4 — Regression gate, ops, documentation (results)

**Status:** complete (2026-11-18).  
**Plan:** [USER_HANDLE_PHASED_PLAN.md](USER_HANDLE_PHASED_PLAN.md) § H4.  
**Rollup:** [USER_HANDLE_RESULTS.md](USER_HANDLE_RESULTS.md).

## Scripts

| Script | `package.json` |
| --- | --- |
| [`verify-user-handle.mjs`](../scripts/verify-user-handle.mjs) | `pnpm verify:user-handle` (build + fast checks, no DB) |
| [`verify-user-handle-exit.mjs`](../scripts/verify-user-handle-exit.mjs) | `pnpm verify:user-handle:exit` (requires `TEST_DATABASE_URL` ending in `_test`) |

## Ops / docs touched

| Artifact | Change |
| --- | --- |
| [PRODUCTION.md](../PRODUCTION.md) | Both handle migrations must run before NOT NULL contract |
| [README.md](../README.md) | One-line handle summary + link to rollup |
| [USER_HANDLE_RESULTS.md](USER_HANDLE_RESULTS.md) | Acceptance rollup + manual checklist |

## Verification matrix

| Command | DB | Expected |
| --- | --- | --- |
| `pnpm verify:user-handle` | No | Static + Vitest slice OK |
| `pnpm build` | No | Nest compile |
| `pnpm test` | No | Backend unit tests |
| `pnpm db:check` | No | Drizzle migration graph |
| `TEST_DATABASE_URL=…/_test pnpm test:user-handle:integration` | Yes | Uniqueness, NOT NULL |
| `TEST_DATABASE_URL=…/_test pnpm test:auth:integration` | Yes | Register/session `handle` |
| `TEST_DATABASE_URL=…/_test pnpm test:profile:integration` | Yes | GET/PATCH handle |
| `pnpm api:check` (backend + frontend) | No | OpenAPI drift |
| `cd solve-tracker-frontend && pnpm test` | No | Client parsers + UX helpers |
| `TEST_DATABASE_URL=…/_test pnpm verify:user-handle:exit` | Yes | Full automated exit |

## Verification run (H4)

| Command | Result |
| --- | --- |
| `pnpm verify:user-handle` | Pass — 18 checks + Vitest slice (45 tests) |
| `TEST_DATABASE_URL=…/_test pnpm verify:user-handle:exit` | Optional pre-release (needs `_test` DB) |

## Exit criterion

**USER-HANDLE** MVP is closed when automated fast verify passes in CI and operators sign the manual checklist in [USER_HANDLE_RESULTS.md](USER_HANDLE_RESULTS.md) on staging. Public-by-handle and handle-login remain explicitly out of scope.