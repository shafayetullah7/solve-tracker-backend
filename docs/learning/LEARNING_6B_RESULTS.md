# Phase 6B — Overview dashboard

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`

## Delivered

- **[`load-dashboard-continue-learning.ts`](../../../solve-tracker-frontend/src/lib/dashboard/load-dashboard-continue-learning.ts)** — `GET /learning/guides` (5 active, `updatedAt` desc) + per-guide `enrollment` / `tree` via `allSettled`; resume href from `resumeNodeId`, first node, or guide overview.
- **[`DashboardContinueLearningSection.tsx`](../../../solve-tracker-frontend/src/components/dashboard/DashboardContinueLearningSection.tsx)** — loading / error / empty CTAs / guide cards with progress.
- **[`routes/app/index.tsx`](../../../solve-tracker-frontend/src/routes/app/index.tsx)** — parallel loaders for summaries, previews, activity, and learning; composed UI; **Continue learning** above queue when `VITE_LEARNING_GUIDES_ENABLED=true`. Summary failure no longer blocks queue or activity.

**Backend:** none (per [LEARNING_6_DECISIONS.md](./LEARNING_6_DECISIONS.md)).

## Loading model

| Domain | Loader | Blocks others? |
|--------|--------|----------------|
| Continue learning | `loadDashboardContinueLearning` | No |
| Practice summaries | `GET /progress/summaries` | No |
| Queue previews | `loadDashboardPreviews` | No |
| Activity | `GET /progress/activity` | No |

Refresh toolbar re-runs all four when learning flag is on.

## Tests

| File | Coverage |
|------|----------|
| `load-dashboard-continue-learning.test.ts` | List fan-out, empty, list error, partial enrollment/tree failure, resume fallbacks |
| `DashboardContinueLearningSection.test.tsx` | Loading, error+retry, empty CTAs, ready card |

Frontend **`pnpm check`:** **463** tests (+9).

## Manual QA checklist

| Check | Pass criteria |
|-------|----------------|
| Flag on | Continue learning appears above practice queue |
| Flag off | No learning block; parallel practice loaders still work |
| Empty library | New / import / all guides links; problem queue visible below |
| Resume | **Continue** opens study URL when `resumeNodeId` set |
| Summary API failure | Error + retry for stats only; queue/activity still load |
| Learning API failure | Error + retry in learning section only; practice sections intact |
| Mobile 360px | Section stacks; primary buttons tappable |

## Handoff

- **6C** — complete; see [LEARNING_6C_RESULTS.md](./LEARNING_6C_RESULTS.md).
- **6D** — Library search/archive UI; overview list already uses same list API with `status=active` only.