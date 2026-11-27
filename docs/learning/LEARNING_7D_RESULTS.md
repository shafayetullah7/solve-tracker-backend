# Phase 7D — Migration and recovery

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`

## Delivered

- **[`scripts/lib/drizzle-migration-files.mjs`](../../scripts/lib/drizzle-migration-files.mjs)** — Sorted migration folders; split **17** pre-learning + **9** learning (cutoff `20261118174855_discover-e9-public-safety`); journal-aware SQL apply.
- **[`seed-coding-only-rehearsal.ts`](../../scripts/seed-coding-only-rehearsal.ts)** — `rehearsal-coding@example.test`, 15 problems, 3 topics; fails if `learning_guides` exists.
- **[`rehearse-learning-migration-upgrade.mjs`](../../scripts/rehearse-learning-migration-upgrade.mjs)** — Disposable DB `practice_tracker_rehearsal`: pre-learning SQL → seed → `migrate()` ×2 → count assertions; optional `pg_dump`/`pg_restore` when client tools on PATH.

**Schema changes:** none. **Product code:** none.

## Rehearsal outcome

| Step | Result |
|------|--------|
| Pre-learning migrations (17) | pass |
| Coding-only seed | pass (15 problems, 3 topics) |
| Learning migrations via `migrate()` | pass |
| Second `migrate()` (idempotent) | pass |
| Row counts (users/problems/topics) | unchanged |
| `learning_guides` table | present after upgrade |
| Journal rows | 26 |

**pg_dump/pg_restore:** skipped in CI and on dev host without `pg_dump` in PATH (record manual run when Postgres client tools installed). Closes PHASE_0_1 **backup/restore rehearsal** at documentation + scripted upgrade level.

## Rollforward policy (summary)

| Scenario | Action |
|----------|--------|
| Deploy learning | Run `pnpm db:migrate` before new backend; migrations additive only |
| App rollback | Prior backend image + `VITE_LEARNING_GUIDES_ENABLED=false` frontend build |
| Schema rollback | **Rollforward only** — fix-forward; do not drop learning tables in production |
| Backup | Logical `pg_dump`; database backup does not restore Cloudinary bytes |

Full ops RPO/RTO remain provisional per [SECURITY_RECOVERY_ARCHITECTURE.md](./SECURITY_RECOVERY_ARCHITECTURE.md). See [PRODUCTION.md](../../PRODUCTION.md) §Database.

## Gates (2026-11-27)

| Gate | Result |
|------|--------|
| `pnpm build` | pass |
| `pnpm db:check` | pass |
| `node scripts/rehearse-learning-migration-upgrade.mjs --ci` | pass |
| `pnpm test --run` | **331** passed |
| `pnpm api:check` | pass |
| `node scripts/test-learning-integration.mjs` | pass (**98**) |
| `node scripts/test-learning-privacy-integration.mjs` | pass (**22**) |
| `node scripts/benchmark-learning-reads.mjs --tier=ci --ci` | pass |

## Handoff

**7E** — Done: [LEARNING_7E_RESULTS.md](./LEARNING_7E_RESULTS.md).