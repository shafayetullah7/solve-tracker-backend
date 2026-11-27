# Activity and progress contract (Phase 6 R1)

**Status:** Published in Phase **6C** (2026-11-27). Locks from [LEARNING_6_DECISIONS.md](./LEARNING_6_DECISIONS.md) §Metrics remain authoritative; this document adds definitions and edge cases for implementation and UX.

**Purpose:** The product dashboard composes **coding practice** metrics and **learning guide** progress as separate domains. Nothing in Phase 6 merges them into a single streak, weekly bucket, or combined percentage.

---

## Coding / practice domain

### APIs

| Endpoint | Semantics |
|----------|-----------|
| `GET /progress/summaries` | Owner-scoped counts over the problem library (total, solved, unsolved), topic and platform breakdowns |
| `GET /progress/activity?weeks=N` | Weekly **added** and **solved** problem counts + **solve streak** |
| Problem list aggregates | Used by Overview queue previews (`GET /problems` presets) |

### Implementation (backend)

- [`progress.service.ts`](../../src/modules/progress/progress.service.ts) — `getSummaries`, `getActivity`
- [`progress.repository.ts`](../../src/modules/progress/progress.repository.ts) — `loadOverallCounts`, `loadWeeklyAddedCounts`, `loadWeeklySolvedCounts`, `loadDistinctSolveDates`
- [`progress-activity-streak.ts`](../../src/modules/progress/progress-activity-streak.ts) — `computeSolveStreak`

The progress module has **no** imports from learning tables or services.

### Definitions

| Term | Meaning |
|------|---------|
| **Added** (weekly) | Problems whose `createdAt` falls in that UTC week |
| **Solved** (weekly) | Problems marked solved (`solvedAt` / status transition) in that UTC week |
| **Solve streak** | Consecutive UTC calendar days up to “today” with at least one distinct solve date from the problem library |
| **Library complete %** | Solved ÷ total problems in library — not learning steps |

### UI surfaces (frontend)

- Overview stats strip ([`DashboardStatsStrip`](../../../solve-tracker-frontend/src/components/dashboard/DashboardStatsStrip.tsx))
- Activity chart and streak badge ([`DashboardActivitySection`](../../../solve-tracker-frontend/src/components/dashboard/DashboardActivitySection.tsx), [`DashboardStreakBadge`](../../../solve-tracker-frontend/src/components/dashboard/DashboardStreakBadge.tsx))
- Discover / public people activity (where exposed) — practice visibility only; no guide completions

---

## Learning domain

### APIs

| Endpoint | Semantics |
|----------|-----------|
| `GET /learning/guides` | Guide metadata; list sort by guide `updatedAt` |
| `GET /learning/guides/:id/tree` | Node tree, per-node `completed`, aggregate `progress` (`completedRequired`, `totalRequired`, `percent`) |
| `GET /learning/guides/:id/enrollment` | `resumeNodeId`, `lastActivityAt` |
| Node completion / assessments | Structural completion and gated modes (assessments + problem links per 4C/5D) |

### Implementation (backend)

- [`learning-progress.ts`](../../src/modules/learning/learning-progress.ts) — required-step denominator and percent
- [`learning-gated-completion.ts`](../../src/modules/learning/learning-gated-completion.ts) — gates read problem solve status and assessment scores; does not write problem rows

### Definitions

| Term | Meaning |
|------|---------|
| **Required steps** | Nodes with `required: true` |
| **Guide progress** | Count of completed required nodes ÷ total required (optional nodes excluded from denominator) |
| **Resume** | Last studied node from enrollment — not a “solve” event |

### UI surfaces (frontend)

- Overview **Continue learning** ([`DashboardContinueLearningSection`](../../../solve-tracker-frontend/src/components/dashboard/DashboardContinueLearningSection.tsx))
- Guide overview progress line
- **Not** the activity chart, solve streak badge, or library % bar

---

## Independence and no double counting

1. **Separate stores** — Coding metrics aggregate the `problems` table (and topic associations). Learning metrics aggregate learning nodes, enrollments, and assessment attempts. There is no shared “productivity” table.

2. **Gated steps** — Completing a learning node may *require* linked problems to be solved. The gate **reads** problem status; marking a problem solved is a user action on the problem library. That solve appears in **coding** activity only. Node completion appears in **tree progress** only. Two legitimate events, not one merged score.

3. **Learning alone does not move streak** — Finishing guides, passing assessments, or studying content does not increment weekly added/solved buckets or solve streak.

4. **Coding alone does not move guide %** — Marking problems solved does not increment `completedRequired` unless the user completes the node (including gate rules).

5. **Phase 6 UI** — No single widget combines library % with guide %. Overview shows both sections side by side when the learning flag is on.

---

## Mixed-user scenarios

| Scenario | Overview behavior |
|----------|-------------------|
| Learning flag **off** | Coding stats, queue, activity — no learning block |
| Learning flag **on**, empty guides | Continue learning empty CTAs; problem queue and activity unchanged |
| Learning flag **on**, active guides | Continue learning above queue; separate load/error per domain (6B) |
| Summary API fails | Stats error strip; queue/activity/learning may still succeed |
| Activity API fails | Activity retry only; stats and learning unaffected |

---

## Future changes

Merging learning events into `GET /progress/activity`, streak, or a combined dashboard KPI requires:

- An updated written contract (new version of this document or successor)
- Explicit API/query changes — not silent frontend math in Phase 6.

---

## Related docs

- [LEARNING_6_DECISIONS.md](./LEARNING_6_DECISIONS.md) — locked R1 metrics rows
- [LEARNING_6_SLICE_PLAN.md](./LEARNING_6_SLICE_PLAN.md) — slice 6C scope
- [LEARNING_BASELINE_AUDIT.md](./LEARNING_BASELINE_AUDIT.md) — finding A07 (progress vs learning separation)