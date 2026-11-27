# Phase 7H — Beta rollout

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`

## Delivered

| Area | Artifact |
|------|-----------|
| Operator runbook | [LEARNING_BETA_RUNBOOK.md](./LEARNING_BETA_RUNBOOK.md) |
| Blocker triage | [LEARNING_BETA_BLOCKERS.md](./LEARNING_BETA_BLOCKERS.md) |
| Flag build audit | [verify-learning-beta-flag-build.mjs](../../../solve-tracker-frontend/scripts/verify-learning-beta-flag-build.mjs) |
| Cumulative gate | [verify-learning-7h.mjs](../../scripts/verify-learning-7h.mjs) |

**Product code:** none (ops slice).

## Launch quality bar

| # | Check | Evidence | Status |
|---|--------|----------|--------|
| 1 | Cumulative automated gate | `verify-learning-7h.mjs` | pass |
| 2 | Flag off regression | `AppSidebar.learning.test.tsx` (via 7G → `pnpm check`) | pass |
| 3 | Flag on/off build bake | `BETA_FLAG_BUILD=1` + `verify-learning-beta-flag-build.mjs` | pass |
| 4 | Staging manual smoke | Runbook §5 — **operator** before prod widen; automated proxy below | waived |
| 5 | Data rights | 7G export hint + `DELETE /users/me`; [LEARNING_7G_RESULTS.md](./LEARNING_7G_RESULTS.md) | pass |
| 6 | Feedback channel | [LEARNING_BETA_FEEDBACK.md](./LEARNING_BETA_FEEDBACK.md); URL optional via `VITE_BETA_FEEDBACK_URL` | pass |
| 7 | Blockers | Register empty — see §Blockers | pass |

### Automated smoke proxy (no staging browser in CI)

| 6F row | Proxy evidence | Status |
|--------|----------------|--------|
| FLAG off | `AppSidebar.learning.test.tsx` | pass |
| FLAG on | same | pass |
| STRESS code wrap | `BlockViews.test.tsx` / study components | pass ([LEARNING_6F_RESULTS.md](./LEARNING_6F_RESULTS.md)) |
| KB library tabs | shell / library component tests | pass (6E/6F) |
| Practice-only control | flag-off Vitest + problems integration in 7G chain | pass |

**Manual staging** (Chrome/Firefox/Safari per [LEARNING_7_DECISIONS.md](./LEARNING_7_DECISIONS.md)): run [LEARNING_BETA_RUNBOOK.md](./LEARNING_BETA_RUNBOOK.md) §5 once before widening production cohort; record date and origin in deploy notes.

## Blockers

| ID | Severity | Area | Summary | Status |
|----|----------|------|---------|--------|
| — | — | — | No open P0/P1 at 7H signoff | — |

Template and severity rules: [LEARNING_BETA_BLOCKERS.md](./LEARNING_BETA_BLOCKERS.md).

## Flag decision (handoff 7I)

**Choice: A** — Keep build-time `VITE_LEARNING_GUIDES_ENABLED` through the beta cohort.

| Option | Decision |
|--------|----------|
| A — Keep flag | **Selected.** Prod practice-only default stays `false`; beta = explicit rebuild `true`. |
| B — Default on in examples | Not selected; staging still documents `true` in runbook. |
| C — Remove flag in 7I | Not selected; optional revisit at [LEARNING_7_PHASE_SIGNOFF.md](./LEARNING_7_PHASE_SIGNOFF.md) if launch is always-on. |

## Static / CI gates

```text
export TEST_DATABASE_URL=postgresql://…/practice_tracker_test
node scripts/verify-learning-7h.mjs
```

Signoff recording (dual frontend builds):

```text
BETA_FLAG_BUILD=1 node scripts/verify-learning-7h.mjs
```

## Gates (2026-11-27)

| Gate | Result |
|------|--------|
| `node scripts/verify-learning-7h.mjs` | pass (includes 7G chain) |
| `BETA_FLAG_BUILD=1 node scripts/verify-learning-7h.mjs` | pass |
| Data-rights integration (via 7G) | **16** assertions |

## Handoff

**7I** — Phase 7 signoff, requirements §8 honesty, [LEARNING_7_PHASE_SIGNOFF.md](./LEARNING_7_PHASE_SIGNOFF.md), refresh [BASELINE_RUN.md](./BASELINE_RUN.md).