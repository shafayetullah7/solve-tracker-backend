# GOOGLE-RISC R7 — Regression gate (results)

**Status:** complete (2026-11-18).  
**Plan:** [GOOGLE_RISC_PHASED_PLAN.md](GOOGLE_RISC_PHASED_PLAN.md) § R7.

## Scripts

| Script | `package.json` |
| --- | --- |
| [`verify-google-risc.mjs`](../scripts/verify-google-risc.mjs) | `pnpm verify:google-risc` (build + fast checks, no DB) |
| [`verify-google-risc-exit.mjs`](../scripts/verify-google-risc-exit.mjs) | `pnpm verify:google-risc-exit` (requires `TEST_DATABASE_URL`) |

**Standalone gate:** `verify:google-risc` is **not** wired into `verify:phase-8` or `verify:phase-9`. Pre-release monorepo checklists may run `pnpm verify:google-risc-exit` alongside `pnpm verify:google-oauth:exit`.

## Fast verify checks (`verify-google-risc.mjs`)

| Area | What is asserted |
| --- | --- |
| Env schema | Default RISC off; RISC on without OAuth rejected; RISC on with OAuth parses |
| Test fixtures | `authTestEnvironment` sets `GOOGLE_RISC_ENABLED: 'false'` |
| `.env.example` | Documents `GOOGLE_RISC_ENABLED` |
| Wiring | `GoogleRiscModule` / controller; `forwardRef(() => GoogleRiscModule)` in `AuthModule`; no `AuthSecurityGuard` on RISC controller; raw body branch in `configure-app`; OpenAPI path `"/auth/google/risc"` |
| Unit | `pnpm exec vitest run src/modules/auth/risc` |
| HTTP smoke | RISC off → **404**; enabled stub → empty body **400** `RISC_SET_MALFORMED` |

HTTP smoke overrides `GoogleRiscService.isEnabled` (same pattern as OAuth verify — `ConfigModule` uses `skipProcessEnv: true`).

## Exit verify (`verify-google-risc-exit.mjs`)

1. `pnpm build`
2. `node scripts/verify-google-risc.mjs`
3. `pnpm test:risc-receipts:integration`
4. `pnpm test:google-risc-handle:integration`
5. `pnpm test:google-risc-http:integration`
6. `pnpm api:check`

Excludes `preflight:google-risc` and `sign:test-risc-set` (ops tools, not regression gates).

## Verification run

| Command | Result |
| --- | --- |
| `pnpm verify:google-risc` | **15** checks OK (2026-11-18) |
| `TEST_DATABASE_URL=…/_test pnpm verify:google-risc-exit` | Run locally with dedicated `*_test` DB |

CI/default developer: **`GOOGLE_RISC_ENABLED=false`**; no Google Cloud egress required.

## GOOGLE-RISC closed

Phases **R0–R7** complete. Enable RISC per [GOOGLE_RISC_STREAM_SETUP.md](GOOGLE_RISC_STREAM_SETUP.md) and [GOOGLE_RISC_RESULTS.md](GOOGLE_RISC_RESULTS.md) after staging stream evidence ([GOOGLE_RISC_R5_RESULTS.md](GOOGLE_RISC_R5_RESULTS.md)).