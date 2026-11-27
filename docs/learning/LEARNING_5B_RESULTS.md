# Learning 5B — problem resolution read model signoff

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`  
**Prerequisite:** [LEARNING_5A_RESULTS.md](./LEARNING_5A_RESULTS.md)

## Delivered

- **`ProblemsLearningReadService`** — batch `findStatusesByNormalizedUrls`; exported from `ProblemsModule`; imported by `LearningModule`
- **`ProblemsRepository.findStatusesByNormalizedUrls`** — `IN` query on `(user_id, normalized_url)`
- **[`learning-problem-resolution.ts`](../../src/modules/learning/learning-problem-resolution.ts)** — `unresolved` | `linked_unsolved` | `solved`; enrich blocks + tree summaries
- **`GET .../nodes/:nodeId/content`** — optional `problemResolution`, `problemId` on `problem` blocks
- **`GET .../tree`** — optional `problemBlocks[]` per node (`blockId`, resolution, optional `problemId`)

**Learner scope:** authenticated user id (R1 owner-study); no cross-account leakage.

**No migrations; no 5C UI; no 5D gated completion.**

## Gates (2026-11-27)

| Gate | Result |
|------|--------|
| `pnpm build` | pass |
| `pnpm test` | 317 passed |
| `pnpm api:check` | pass |
| `node scripts/test-learning-integration.mjs` | pass (**67** assertions) |
| `pnpm check` (frontend) | pass (440 tests; types only) |

## Handoff

**5C** may start: study UI badges/CTAs using `problemResolution` and `problemId` on content/tree reads.