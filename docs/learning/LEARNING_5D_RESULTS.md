# Phase 5D — Gated completion + problem links

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`

## Rule (tree GET)

For `completion_mode = gated`, `node.completed` is derived when **all** of the following hold:

1. **Assessments (4C):** every `learning_assessment_links` row on the node has a published active revision and the enrollment’s best finalized score ≥ active `passingBasisPoints`.
2. **Problems (5D):** every `learning_problem_links` row on the node resolves to `solved` for the learner (`ProblemsLearningReadService` batch on distinct `normalized_url`).
3. **Empty gate:** gated node with **no** assessment links **and** **no** problem links → never complete.

Marking a linked problem unsolved or removing link rows drops the node from the complete set on the next tree read (no migration).

## Where it lives

| Piece | Location |
|--------|----------|
| Pure gate evaluation | [`learning-gated-completion.ts`](../src/modules/learning/learning-gated-completion.ts) |
| Orchestrator | [`LearningGatedCompletionService`](../src/modules/learning/learning-gated-completion.service.ts) |
| Gated problem link query | [`LearningGuidesRepository.findGatedProblemLinksForGuide`](../src/modules/learning/learning-guides.repository.ts) |
| Tree wiring | [`LearningGuidesService.tree`](../src/modules/learning/learning-guides.service.ts) |
| Assessment-only parity | [`AttemptsRepository.resolveGatedCompleteNodeIds`](../src/modules/assessments/attempts.repository.ts) uses the same pure helper with an empty problem map |

## UX / API copy

- Manual complete on gated nodes: `GATED_COMPLETION` mentions assessments **and** linked problems.
- Study gated banner: combined gate messaging; open problems called out via `hasOpenProblems`.

## Gates

- Backend unit: `learning-gated-completion.spec.ts` (+8 tests).
- Integration: new assessment+problem gated sequence (+7 asserts); existing assessment-only gated block unchanged (74 total).