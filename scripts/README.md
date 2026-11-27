# Backend scripts

`package.json` keeps **tooling only** (build, unit tests, lint, database, OpenAPI). Integration suites, phase exit gates, and feature verifiers live here as `.mjs` files — run them with `node`, not new `pnpm` aliases.

Working directory: `solve-tracker-backend/`. Most HTTP integration scripts need a fresh build and `TEST_DATABASE_URL` pointing at a database whose name ends in `_test`.

```bash
pnpm build
export TEST_DATABASE_URL=postgresql://practice:practice_dev@127.0.0.1:5437/practice_tracker_test
# optional: MIGRATION_REHEARSAL_DATABASE_URL (defaults to practice_tracker_rehearsal)
# LEARNING_MIGRATION_REHEARSAL_SKIP_RESTORE=1 skips pg_dump when client tools are installed
node scripts/test-auth-integration.mjs
```

## PostgreSQL integration (by feature)

| Script | Notes |
| --- | --- |
| `test-auth-integration.mjs` | Auth HTTP + transactions; mocked email |
| `test-topics-integration.mjs` | Topics CRUD and isolation |
| `test-problems-integration.mjs` | Problems, progress-related matrix |
| `test-profile-integration.mjs` | Profile / media linkage |
| `test-learning-integration.mjs` | Learning guides API |
| `test-learning-privacy-integration.mjs` | Learning data must not leak via Discover/profile/public/progress (`DISCOVER_MODE=full`) |
| `seed-learning-perf-fixture.ts` | Synthetic learning perf data (`--tier=ci\|large`; stress needs `LEARNING_PERF_STRESS=1`) |
| `benchmark-learning-reads.mjs` | `EXPLAIN` + warmed HTTP on list/tree/attempt reads; `--ci` for soft regression asserts |
| `seed-coding-only-rehearsal.ts` | Pre-learning coding fixture for migration rehearsal |
| `rehearse-learning-migration-upgrade.mjs` | Pre-learning → learning upgrade on `practice_tracker_rehearsal`; `--ci` skips dump/restore |
| `seed-learning-e2e.ts` | Optional manual staging fixture; emits `E2E_LEARNING_JSON` |
| `verify-learning-7e.mjs` | Phase 7E cumulative gates; `E2E_LIVE=1` for `verify-ssr-2` only |
| `audit-learning-safe-logging.mjs` | Phase 7F static log audit (learning + assessments) |
| `test-learning-ops-integration.mjs` | Phase 7F health probes, attempt DTO safety, import size |
| `verify-learning-7f.mjs` | Phase 7F exit gate (audit + 7E static + ops integration); `OPS_LIVE=1` optional probe |
| `test-learning-data-rights-integration.mjs` | Phase 7G export/delete/account erasure integration |
| `verify-learning-7g.mjs` | Phase 7G exit gate (7F + data-rights integration) |
| `verify-learning-7h.mjs` | Phase 7H exit gate (7G + optional `BETA_FLAG_BUILD=1` dual frontend build) |
| `test-discover-integration.mjs` | Discover core |
| `test-discover-people-integration.mjs` | Discover people |
| `test-discover-compare-integration.mjs` | Compare flows |
| `test-discover-events-integration.mjs` | Discover events |
| `test-auth-provider-identities.mjs` | Google identity rows |
| `test-google-oauth-auth.mjs` | OAuth auth paths |
| `test-google-oauth-integration.mjs` | OAuth + Postgres |
| `test-risc-receipts.mjs` | RISC receipt store |
| `test-google-risc-handle.mjs` | RISC handler |
| `test-google-risc-http.mjs` | RISC HTTP |
| `test-user-handle-schema.mjs` | Handle schema (no build) |
| `test-backend-restart-persistence.mjs` | Restart persistence |

## Static / fast verifiers

| Script | Notes |
| --- | --- |
| `verify-google-oauth.mjs` | OAuth contract grep (run `pnpm build` first if code changed) |
| `verify-google-risc.mjs` | RISC contract |
| `verify-user-handle.mjs` | Handle contract |

## Exit orchestrators (optional regression umbrellas)

These chain builds, unit tests, integration scripts, and frontend checks. Use when replaying a historical gate; do not add `package.json` entries for them.

| Script | Purpose |
| --- | --- |
| `verify-phase-5-exit.mjs` … `verify-phase-9-exit.mjs` | MVP phase exit criteria |
| `verify-platform-p1.mjs` … `verify-platform-p4.mjs`, `verify-platform-cls.mjs` | Platform classification |
| `verify-discover-e1.mjs` … `verify-discover-e9.mjs`, `verify-discover.mjs` | Discover launch |
| `verify-google-oauth-exit.mjs`, `verify-google-risc-exit.mjs`, `verify-user-handle-exit.mjs` | Feature exit |

## Other utilities

| Script | Notes |
| --- | --- |
| `preflight-google-risc-endpoint.mjs` | RISC endpoint smoke |
| `sign-test-risc-set.mjs` | Sign test RISC payloads |
| `export-openapi.mjs` | OpenAPI snapshot (also via `pnpm api:export`) |
| `generate-api-types.mjs` | Types codegen (frontend calls via `pnpm api:generate`) |

Frontend smoke and contract scripts: `solve-tracker-frontend/scripts/README.md`.