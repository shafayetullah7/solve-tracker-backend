# Phase 4 — assessment engine (R1 signoff)

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`  
**Slice plan:** [LEARNING_4_SLICE_PLAN.md](./LEARNING_4_SLICE_PLAN.md)

## Scope delivered

| Slice | Results | Conventions |
|-------|---------|-------------|
| 4A — Authoring, publish, questions | [LEARNING_4A_RESULTS.md](./LEARNING_4A_RESULTS.md) | [LEARNING_4A_CONVENTIONS.md](./LEARNING_4A_CONVENTIONS.md) |
| 4B — Attempts, grading, idempotency | [LEARNING_4B_RESULTS.md](./LEARNING_4B_RESULTS.md) | [LEARNING_4B_CONVENTIONS.md](./LEARNING_4B_CONVENTIONS.md) |
| 4C — Assessment block, gated tree | [LEARNING_4C_RESULTS.md](./LEARNING_4C_RESULTS.md) | [LEARNING_4C_CONVENTIONS.md](./LEARNING_4C_CONVENTIONS.md) |
| 4D — MC, numerical, retake UX | [LEARNING_4D_RESULTS.md](./LEARNING_4D_RESULTS.md) | [LEARNING_4D_CONVENTIONS.md](./LEARNING_4D_CONVENTIONS.md) |

**Learner route (frontend):** `/app/learning/:guideId/assessments/:assessmentId`  
**Integration harness:** `node scripts/test-learning-integration.mjs` (assessment + gated flows).

## Exit criteria (roadmap)

| Criterion | Evidence |
|-----------|----------|
| Learner on gated step can pass required assessment | Integration: gated block, publish, attempt, submit, tree `completed` |
| Scores reproducible | `grade-objective.ts` + basis-points math; unit specs |
| Attempts preserved | Finalized rows kept; retake starts new attempt (`POST .../attempts` 201) |
| 4A–4D signoff docs and gates green | This file + per-slice RESULTS; [BASELINE_RUN.md](./BASELINE_RUN.md) |

## Gates (recorded 2026-11-27)

| Gate | Command | Result |
|------|---------|--------|
| Backend build | `pnpm build` | pass |
| Backend unit | `pnpm test` | 307 passed |
| OpenAPI | `pnpm api:check` | pass |
| DB schema check | `pnpm db:check` | pass (known drizzle-kit explain warning only) |
| Learning integration | `node scripts/test-learning-integration.mjs` | pass (46 assertions) |
| Frontend | `pnpm check` (solve-tracker-frontend) | pass (439 tests) |

## Explicitly deferred (R2 / R3)

From roadmap and slice plan: question banks, flashcards, short-answer self-review at scale, timers/expiry sweeper, attempt list/history API, abandon endpoint, compatibility identity, portable assessment JSON in guide bundles, executable sandboxes, AI grading, gate reason codes on tree.

## Policy summary (cross-slice)

- **Authoring** mutations: `learning_operations` (`assessment.v1`).
- **Attempt** save/submit: `attempt.v1`; start 200 resume / 201 new; `/submissions` alias.
- **Attempt `passed`:** threshold on **attempt revision** (4B).
- **Gated completion:** best finalized score vs **active** revision threshold (4C); link validation on content replace.
- **Numerical R1:** scaled integers (`valueScaled`); MC exact set, duplicate selections score 0 (4D).

Phase 4 R1 is **complete** on `feature/learning-guides` pending merge discipline and production migration policy outside this signoff.