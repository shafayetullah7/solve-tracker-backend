# GOOGLE-AUTH G7 — Regression gate (results)

**Status:** complete (2026-11-18).  
**Plan:** [GOOGLE_OAUTH_PHASED_PLAN.md](GOOGLE_OAUTH_PHASED_PLAN.md) § G7.

## Scripts

| Script | `package.json` |
| --- | --- |
| [`verify-google-oauth.mjs`](../scripts/verify-google-oauth.mjs) | `pnpm verify:google-oauth` (build + 11 fast checks, no DB) |
| [`verify-google-oauth-exit.mjs`](../scripts/verify-google-oauth-exit.mjs) | `pnpm verify:google-oauth:exit` (requires `TEST_DATABASE_URL`) |

[`verify-phase-8-exit.mjs`](../scripts/verify-phase-8-exit.mjs): paths fixed for `solve-tracker-frontend`, `docs/`, and `/app/*` routes; runs Google verify + exit + frontend `pnpm check`. Phase 5–7 exit scripts updated for monorepo paths; phase 7 frontend gate uses `pnpm check`.

## Exit criterion

**Google sign-in is enabled in a target environment only when** all `GOOGLE_OAUTH_*` variables, Console redirect URI, `FRONTEND_ORIGIN`, and `VITE_GOOGLE_OAUTH_ENABLED` are configured together ([GOOGLE_OAUTH_RESULTS.md](GOOGLE_OAUTH_RESULTS.md)).

Automated gates pass with **`GOOGLE_OAUTH_ENABLED=false`** (default in CI and `authTestEnvironment`).

Manual staging checklist (§10 in phased plan) remains operator-signed in [GOOGLE_OAUTH_RESULTS.md](GOOGLE_OAUTH_RESULTS.md); not required for CI.

## Verification run

| Command | Result |
| --- | --- |
| `pnpm verify:google-oauth` | 11 checks OK |
| `TEST_DATABASE_URL=…/_test pnpm verify:google-oauth:exit` | identities + OAuth integration + api drift |
| `TEST_DATABASE_URL=…/_test pnpm verify:phase-8` | Umbrella including Google |

## GOOGLE-AUTH closed

Phases **G0–G7** complete. Rollout: enable flags + credentials per environment; use manual checklist on staging.