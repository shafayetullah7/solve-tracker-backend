# Baseline run — feature/learning-guides

Recorded during 3A slice and Phase 0 closure. Branch discipline: no `main`, no production migration. Formal closure: [PHASE_0_1_CLOSURE.md](./PHASE_0_1_CLOSURE.md).

## Pinned refs

| Repository | Branch | SHA |
|------------|--------|-----|
| solve-tracker-backend | feature/learning-guides | `552cc1c7e08938a385f1e3ccba7cef2e349f9296` (+ Phase 4 R1 working tree, 2026-11-27) |
| solve-tracker-frontend | feature/learning-guides | `fc621ea9ba98f5e7d3b1e382f433cec6b3fe1664` (+ Phase 4 R1 working tree, 2026-11-27) |

## Toolchain

- Node **v26.13.1**
- pnpm **12.18.0**

## Static gates (no Postgres)

Phase 4 R1 signoff: [LEARNING_4_PHASE_SIGNOFF.md](./LEARNING_4_PHASE_SIGNOFF.md).

### Backend (2026-11-27)

| Command | Result |
|---------|--------|
| `pnpm lint` | pass (existing warnings only) |
| `pnpm test --run` | 307 passed |
| `pnpm build` | pass |
| `pnpm db:check` | pass |
| `pnpm api:check` | pass |

### Frontend (2026-11-27)

| Command | Result |
|---------|--------|
| `pnpm check` | pass (439 tests) |

## Runtime gates (Postgres `TEST_DATABASE_URL` …/_test)

Database: `postgresql://practice:practice_dev@127.0.0.1:5437/practice_tracker_test`

| Command | Result |
|---------|--------|
| `pnpm db:migrate` (×2 idempotent) | pass |
| `node scripts/test-topics-integration.mjs` (after `pnpm build`) | pass (16 assertions) |
| `node scripts/test-learning-integration.mjs` (after `pnpm build`) | pass (46 assertions; through 4D.1 question types) |

Frontend: `pnpm build` + `api:check` pass with backend. Historical 3B: [LEARNING_3B_RESULTS.md](./LEARNING_3B_RESULTS.md).