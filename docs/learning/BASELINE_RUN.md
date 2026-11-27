# Baseline run — feature/learning-guides

Recorded during 3A slice and Phase 0 closure. Branch discipline: no `main`, no production migration. Formal closure: [PHASE_0_1_CLOSURE.md](./PHASE_0_1_CLOSURE.md). **Phase 6 R1:** [LEARNING_6_PHASE_SIGNOFF.md](./LEARNING_6_PHASE_SIGNOFF.md).

## Pinned refs

| Repository | Branch | SHA |
|------------|--------|-----|
| solve-tracker-backend | feature/learning-guides | `ac6a649b1cc4c58fd730fbc9b0a69bed6168acf3` (6G, 2026-11-27) |
| solve-tracker-frontend | feature/learning-guides | `93388d9aeade06c3e487f5e3dc8a772390b7cf9b` (6G, 2026-11-27) |

## Toolchain

- Node **v26.13.1**
- pnpm **12.18.0**

## Static gates (no Postgres)

Phase 4 R1 signoff: [LEARNING_4_PHASE_SIGNOFF.md](./LEARNING_4_PHASE_SIGNOFF.md).  
Phase 6 R1 signoff: [LEARNING_6_PHASE_SIGNOFF.md](./LEARNING_6_PHASE_SIGNOFF.md).

### Backend (2026-11-27, 6G)

| Command | Result |
|---------|--------|
| `pnpm lint` | pass (existing warnings only) |
| `pnpm test --run` | 327 passed |
| `pnpm build` | pass |
| `pnpm db:check` | pass |
| `pnpm api:check` | pass |

### Frontend (2026-11-27, 6G)

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
| `node scripts/test-learning-integration.mjs` (after `pnpm build`) | pass (85 assertions) |
| `node scripts/test-problems-integration.mjs` (after `pnpm build`) | pass (66 assertions) |

Frontend: `pnpm build` + `api:check` pass with backend. Historical 3B: [LEARNING_3B_RESULTS.md](./LEARNING_3B_RESULTS.md).

## Manual UX signoff (Phase 6)

Not a formal screenshot archive ([PHASE_0_1_CLOSURE.md](./PHASE_0_1_CLOSURE.md) waiver). Recorded in [LEARNING_6F_VERIFICATION_MATRIX.md](./LEARNING_6F_VERIFICATION_MATRIX.md) and [LEARNING_6_PHASE_SIGNOFF.md](./LEARNING_6_PHASE_SIGNOFF.md) §Journeys: practice-only (flag off), learning-first (flag on), mixed-user metrics separation.