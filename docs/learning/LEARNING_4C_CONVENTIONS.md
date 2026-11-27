# Learning 4C.1 — conventions hardening

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`

## Assessment block links

On `replaceNodeContent`, each `assessment` block runs [`assertLinkableGateAssessment`](../src/modules/learning/learning-gate-assessment.validation.ts):

| Check | HTTP |
|--------|------|
| Assessment exists for `(guideId, assessmentId)` | `404 NOT_FOUND` |
| Not archived | `409 ASSESSMENT_ARCHIVED` |
| `activeRevisionId` set (published at least once) | `409 ASSESSMENT_UNPUBLISHED` |

Composite FKs on `learning_assessment_links` remain the database backstop.

## Author workflow

- `patchNode` / `createNode` may set `completionMode: gated` before an assessment block exists.
- A gated node with **no** linked assessments never completes (empty AND over zero requirements).

## Gated completion (tree read)

Implemented in [`AttemptsRepository.resolveGatedCompleteNodeIds`](../src/modules/assessments/attempts.repository.ts):

- Collect all assessment IDs from gated nodes via `learning_assessment_links`.
- **One query** for active-revision `passingBasisPoints` per assessment (`loadPublishedGateThresholds`).
- **One query** for best finalized `scoreBasisPoints` per assessment for the enrollment.
- Node complete iff **every** linked assessment has `best >= active passingBasisPoints`; missing/unpublished/archived assessments cannot satisfy the gate.

## Attempt pass vs gate (see also [LEARNING_4B_CONVENTIONS.md](./LEARNING_4B_CONVENTIONS.md))

- Attempt DTO `passed` uses the **revision the attempt started on**.
- Gated node completion uses the **active** revision threshold and best finalized score (any attempt revision).
- Republishing a higher passing threshold can reopen a gated step even when an older attempt still shows `passed: true` on its revision.