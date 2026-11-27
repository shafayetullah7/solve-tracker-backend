# Learning 4A — assessment authoring

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`

## Delivered

- Migration `drizzle/20261127140343_learning_assessments_4a/`
- Tables: `learning_assessments`, `learning_assessment_revisions` (draft rev 0), `learning_questions`
- Enums: `learning_question_kind`, `learning_assessment_feedback_policy`
- **AssessmentsModule** — owner routes under `/learning/guides/:guideId/assessments`
- Draft questions (single choice, true/false); publish creates immutable revision 1

## Deferred (4B+)

- Attempts, learner DTOs, grading runtime
- Assessment block, gated completion

## 4A.1 conventions (2026-11-27)

- Migration `drizzle/20261127141554_learning_assessments_active_revision_fk/`
- `AssessmentMutationsRepository` + `learning_operations` idempotency (full DTO replay)
- `AttemptsController` split; OpenAPI 201 for authoring POSTs; `GET .../draft`, `POST .../revisions`
- See [LEARNING_4A_CONVENTIONS.md](./LEARNING_4A_CONVENTIONS.md)

## Gates

| Gate | Result |
|------|--------|
| `pnpm build` | pass |
| `pnpm test` | pass (305+; validation + service specs) |
| `pnpm db:check` | pass with known FK snapshot note (see 4A conventions doc) |
| `node scripts/test-learning-integration.mjs` | pass (idempotency assertions) |