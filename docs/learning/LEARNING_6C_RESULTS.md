# Phase 6C — Metrics and activity semantics

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`

## Delivered

- **[LEARNING_6_ACTIVITY_CONTRACT.md](./LEARNING_6_ACTIVITY_CONTRACT.md)** — Formal dual-domain contract (coding vs learning), definitions, gated-step independence, mixed-user table, future-change rule.
- **[`activity-contract-copy.ts`](../../../solve-tracker-frontend/src/lib/dashboard/activity-contract-copy.ts)** — Single source for Overview strings tied to the contract.
- **Overview copy:** Activity subtitle (coding-only), stats strip `aria-label`, Continue learning hint.

**Backend code:** none.

## Progress module audit

| Check | Result |
|-------|--------|
| `learning` references under `src/modules/progress/` | **None** |
| `getSummaries` / `getActivity` data sources | Problem repository only (`progress.service.ts`, `progress.repository.ts`) |
| Streak | `computeSolveStreak` on distinct problem solve dates only |

`pnpm exec vitest run progress.service.spec.ts progress-activity-streak.spec.ts` — **5 passed**, unchanged.

## Tests

| File | Coverage |
|------|----------|
| `activity-contract-copy.test.ts` | Stable exported strings |
| `DashboardActivitySection.test.tsx` | Contract subtitle visible |
| `DashboardStatsStrip.test.tsx` | Updated region label |
| `DashboardContinueLearningSection.test.tsx` | Guide progress hint |

Frontend **`pnpm check`:** **464** tests (+1).  
Backend progress specs: **5** passed (no new tests).

## Manual QA checklist

| Check | Pass criteria |
|-------|----------------|
| Activity subtitle | Mentions coding problems and solve streak |
| Stats strip | Screen reader / region name “Problem library totals” |
| Continue learning | Hint separates guide steps from solves |
| Flag off | No Continue learning block; activity copy still coding-only |
| No combined widget | No merged % across guides and problems |

## Handoff

- **6D** — complete; see [LEARNING_6D_RESULTS.md](./LEARNING_6D_RESULTS.md).
- **6E** — Landing/onboarding may cite [LEARNING_6_ACTIVITY_CONTRACT.md](./LEARNING_6_ACTIVITY_CONTRACT.md) for accurate claims.