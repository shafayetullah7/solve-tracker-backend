# Baseline run — feature/learning-guides

Recorded during 3A slice and Phase 0 closure. Branch discipline: no `main`, no production migration. Formal closure: [PHASE_0_1_CLOSURE.md](./PHASE_0_1_CLOSURE.md).

## Pinned refs

| Repository | Branch | SHA |
|------------|--------|-----|
| solve-tracker-backend | feature/learning-guides | `d603b8392ff83cdb2f45b3a95493c7155327bc1c` |
| solve-tracker-frontend | feature/learning-guides | `e7b5074e092fef7484623fa982554772045470d2` |

## Toolchain

- Node **v26.13.1**
- pnpm **12.18.0**

## Static gates (no Postgres)

### Backend @ e8a30b9

| Command | Result |
|---------|--------|
| `pnpm lint` | pass (existing warnings only) |
| `pnpm test --run` | 293 passed |
| `pnpm build` | pass |
| `pnpm db:check` | pass |
| `pnpm api:check` | pass (pre–LearningModule wire) |

### Frontend @ 27bbf2c

| Command | Result |
|---------|--------|
| `pnpm check` | pass (423 tests) |

## Runtime gates (Postgres `TEST_DATABASE_URL` …/_test)

Database: `postgresql://practice:practice_dev@127.0.0.1:5437/practice_tracker_test`

| Command | Result |
|---------|--------|
| `pnpm db:migrate` (×2 idempotent) | pass |
| `node scripts/test-topics-integration.mjs` (after `pnpm build`) | pass (16 assertions) |
| `node scripts/test-learning-integration.mjs` (after `pnpm build`) | pass (27 assertions; 3A tree + 3B content/progress) |

Frontend post-3B: `pnpm check` 433 tests pass; `pnpm build` + `api:check` pass. See [LEARNING_3B_RESULTS.md](./LEARNING_3B_RESULTS.md).