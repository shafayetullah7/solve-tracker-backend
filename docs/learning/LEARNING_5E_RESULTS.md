# Phase 5E — Problem detail backlinks

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`

## Route

`GET /problems/:problemId/learning-references` — owner only; returns `{ items: [{ guideId, guideTitle, nodeId, nodeTitle }] }`.

## Rule

1. Load owned problem; **404** if `problems.user_id` ≠ caller.
2. Match `learning_problem_links.normalized_url` to `problems.normalized_url`.
3. Join `learning_blocks` → `learning_nodes` → `learning_guides`; require `guide.owner_id = caller`, non-deleted guide and node.
4. Dedupe by `(guideId, nodeId)`; stable sort by guide title, then node title.

No `LearningModule` import in Problems — query lives in [`ProblemsRepository.listLearningReferencesForNormalizedUrl`](../src/modules/problems/problems.repository.ts).

## Frontend

Problem detail loads references in parallel with problem GET; `ProblemLearningReferences` in the frontend links to study routes when non-empty.

## Gates

- Backend unit: `problems-learning-references.spec.ts` (+2).
- Integration: +8 asserts (82 cumulative); Swagger includes backlink path.
- Frontend: `ProblemLearningReferences.test.tsx` (+2).