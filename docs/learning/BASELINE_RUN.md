# Baseline run — feature/learning-guides

Recorded during 3A slice and Phase 0 closure. Branch discipline: no `main`, no production migration. Formal closure: [PHASE_0_1_CLOSURE.md](./PHASE_0_1_CLOSURE.md). **Phase 6 R1:** [LEARNING_6_PHASE_SIGNOFF.md](./LEARNING_6_PHASE_SIGNOFF.md). **Phase 7.0 entry:** [LEARNING_7_0_RESULTS.md](./LEARNING_7_0_RESULTS.md) (hardening in progress; not Phase 7 signoff).

## Pinned refs

| Repository | Branch | SHA |
|------------|--------|-----|
| solve-tracker-backend | feature/learning-guides | `497c696396ee0b44203c9d32b9ead395148009b2` (7.0, 2026-11-27) |
| solve-tracker-frontend | feature/learning-guides | `26efe4af99db25cab68e83472ba07e8f87105639` (7.0, 2026-11-27) |

## Toolchain

- Node **v26.13.1**
- pnpm **12.18.0**

## Static gates (no Postgres)

Phase 4 R1 signoff: [LEARNING_4_PHASE_SIGNOFF.md](./LEARNING_4_PHASE_SIGNOFF.md).  
Phase 6 R1 signoff: [LEARNING_6_PHASE_SIGNOFF.md](./LEARNING_6_PHASE_SIGNOFF.md).

### Backend (2026-11-27, 7.0)

| Command | Result |
|---------|--------|
| `pnpm lint` | pass (existing warnings only) |
| `pnpm test --run` | 331 passed (7A) |
| `pnpm test:e2e` | 7 passed |
| `pnpm build` | pass |
| `pnpm db:check` | pass |
| `pnpm api:check` | pass |

### Frontend (2026-11-27, 7.0)

| Command | Result |
|---------|--------|
| `pnpm check` | pass (491 tests) |
| `pnpm build` | pass |
| `pnpm api:check` | pass |

## Runtime gates (Postgres `TEST_DATABASE_URL` …/_test)

Database: `postgresql://practice:practice_dev@127.0.0.1:5437/practice_tracker_test`

| Command | Result |
|---------|--------|
| `pnpm db:migrate` (×2 idempotent) | pass |
| `node scripts/test-topics-integration.mjs` (after `pnpm build`) | pass (16 assertions) |
| `node scripts/test-learning-integration.mjs` (after `pnpm build`) | pass (98 assertions; 7A) |
| `node scripts/test-learning-privacy-integration.mjs` (after `pnpm build`) | pass (22 assertions; 7B) |
| `node scripts/benchmark-learning-reads.mjs --tier=ci --ci` (after seed) | pass (7C soft asserts) |
| `node scripts/rehearse-learning-migration-upgrade.mjs --ci` | pass (7D) |
| `node scripts/verify-learning-7e.mjs` | pass (7E static) |
| `node scripts/test-learning-ops-integration.mjs` | pass (7F ops asserts) |
| `node scripts/verify-learning-7f.mjs` | pass (7F cumulative) |
| `node scripts/test-learning-data-rights-integration.mjs` | pass (7G data rights) |
| `node scripts/verify-learning-7g.mjs` | pass (7G cumulative) |
| `node scripts/verify-learning-7h.mjs` | pass (7H cumulative) |
| `BETA_FLAG_BUILD=1 node scripts/verify-learning-7h.mjs` | pass (dual flag build) |
| `node scripts/test-problems-integration.mjs` (after `pnpm build`) | pass (66 assertions) |

Frontend: `pnpm build` + `api:check` pass with backend. Historical 3B: [LEARNING_3B_RESULTS.md](./LEARNING_3B_RESULTS.md).

## Manual UX signoff (Phase 6)

Not a formal screenshot archive ([PHASE_0_1_CLOSURE.md](./PHASE_0_1_CLOSURE.md) waiver). Recorded in [LEARNING_6F_VERIFICATION_MATRIX.md](./LEARNING_6F_VERIFICATION_MATRIX.md) and [LEARNING_6_PHASE_SIGNOFF.md](./LEARNING_6_PHASE_SIGNOFF.md) §Journeys: practice-only (flag off), learning-first (flag on), mixed-user metrics separation.