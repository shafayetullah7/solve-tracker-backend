# Learning 4D — R1 assessment polish

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`

## Delivered

- Grading + owner APIs for `multiple_choice` (set equality) and `numerical` (scaled integer tolerance)
- Republish creates revision v2+ (draft → new active revision; in-flight attempts stay on bound revision)
- Learner workspace: question navigator, submit confirm, retake after finalize, single/multi/TF/numerical inputs
- Routes: `/app/learning/:guideId/assessments/:assessmentId`

## 4D.1 conventions hardening

- MC duplicate `selectedOptionIds` → 0 points + unit test
- Numerical clear → `null` save in `AssessmentWorkspace`
- Integration: dedicated MC+numerical assessment, full score, retake **201**
- [LEARNING_4D_CONVENTIONS.md](./LEARNING_4D_CONVENTIONS.md)

## Deferred (R2 / later)

- Question banks, timers/sweeper, portable assessment bundle in ZIP, self-review short answer

## Gates

| Gate | Result |
|------|--------|
| `pnpm build` | pass |
| `pnpm test` | 307 passed |
| `pnpm api:check` | pass |
| `node scripts/test-learning-integration.mjs` | pass (46 assertions) |
| Frontend `pnpm check` | pass |