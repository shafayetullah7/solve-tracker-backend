# Learning 4B — attempts and grading

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`

## Delivered

- Migration `drizzle/20261127140456_learning_attempts_4b/`
- `learning_attempts`, `learning_answers`, `learning_attempt_status` enum
- Objective grading (`grade-objective.ts`) for single choice, true/false, multiple choice, numerical
- **`AttemptsController`** (split from authoring): start/resume, get, save answer, submit
- **`AttemptMutationsRepository`**: `operationId` idempotency on save + submit
- Revision-scoped passing threshold on attempt DTO; gated completion still uses active revision (see [LEARNING_4B_CONVENTIONS.md](./LEARNING_4B_CONVENTIONS.md))
- Frontend client stub: `learning-assessments.api.ts`

## 4B.1 conventions hardening

- `attemptId` UUID validation; extended `saveAnswer` response shapes; question must belong to attempt revision
- `POST .../attempts` 200 resume / 201 new; `POST .../submissions` alias
- Integration: resume, save/submit idempotency, cross-account 404, submissions alias

## Gates

| Gate | Result |
|------|--------|
| `pnpm build` | pass |
| `pnpm test` | 306 passed |
| `pnpm api:export` / frontend `api:generate` | pass |
| `node scripts/test-learning-integration.mjs` | pass (38 assertions) |