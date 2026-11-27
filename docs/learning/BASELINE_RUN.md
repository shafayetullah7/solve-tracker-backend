# Baseline run — feature/learning-guides

Recorded during 3A slice close-out. Branch discipline: no `main`, no production migration.

## Pinned refs

| Repository | Branch | SHA |
|------------|--------|-----|
| solve-tracker-backend | feature/learning-guides | `e8a30b951050d46696bf2d38c2d193402fc1ae48` |
| solve-tracker-frontend | feature/learning-guides | `27bbf2c8bcb9e6f0ab816c59ede730944f1a5615` |

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
| `node scripts/test-learning-integration.mjs` (after `pnpm build`) | pass (16 assertions) after `LearningModule` wire-up |

Frontend post-3A: `pnpm check` 429 tests pass; `pnpm api:check` pass.