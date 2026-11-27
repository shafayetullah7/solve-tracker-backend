# Learning 4B.1 — conventions hardening

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`

## Implemented vs [API_ARCHITECTURE.md](./API_ARCHITECTURE.md)

| Target | Implementation |
|--------|----------------|
| Start or resume | `POST .../attempts` → **201** new, **200** resume in-progress |
| Final submit | `POST .../attempts/:attemptId/submit` and alias `.../submissions` |
| Operation idempotency | `learning_operations` via `AttemptMutationsRepository` on save + submit |
| Passing threshold on attempt | `passed` / `passingBasisPoints` use **attempt.revisionId**, not active revision |

## Gated completion vs attempt pass/fail

- **Attempt `passed`:** compares earned points to the **revision the attempt started on** (`findRevisionById`).
- **Gated node completion (4C):** uses **active** revision `passingBasisPoints` and best finalized `scoreBasisPoints` per assessment — see [LEARNING_4C_CONVENTIONS.md](./LEARNING_4C_CONVENTIONS.md).

Publishing a higher threshold does not retroactively fail an in-flight attempt; it may still affect gate eligibility until the learner achieves a new passing finalized score under the active revision rules.

## Idempotency

Hash prefix `attempt.v1` with payload `['save'|'submit', guideId, assessmentId, attemptId, …]`. Replay returns the full attempt DTO via `AttemptsService.toResponse()` (same pattern as 4A authoring).

**Start** is not idempotent (no `operationId` on the route today).