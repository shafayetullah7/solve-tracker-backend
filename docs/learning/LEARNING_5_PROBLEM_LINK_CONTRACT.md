# Learning ↔ Problems read contract (5.0)

**Date:** 2026-11-27  
**Status:** Read service implemented in **5B** ([LEARNING_5B_RESULTS.md](./LEARNING_5B_RESULTS.md))  
**Authority:** [DOMAIN_ARCHITECTURE.md](./DOMAIN_ARCHITECTURE.md)

## Dependency direction

```
LearningModule  →  imports  →  ProblemsModule
ProblemsModule  →  does not import  →  LearningModule
```

No `forwardRef`. Gate orchestration (5D) lives in Learning + existing Attempts patterns; Problems does not compute guide completion.

## Exported provider (5B)

Add **`ProblemsLearningReadService`** (name fixed) in `src/modules/problems/`:

```typescript
// Logical shape — implement in 5B
type ProblemLinkStatus = 'solved' | 'unsolved';

findStatusesByNormalizedUrls(
  learnerId: string,
  normalizedUrls: readonly string[],
): Promise<Map<string, { problemId: string; status: ProblemLinkStatus }>>;
```

- URLs with **no** row are omitted from the map (Learning maps to `unresolved`).
- **Batch-only** for tree/content reads (avoid N+1).
- Build on existing [`ProblemsRepository.findIdByNormalizedUrl`](../../src/modules/problems/problems.repository.ts); extend with status + batch in 5B.

**ProblemsModule** `exports: [ProblemsLearningReadService]`. **LearningModule** adds `imports: [ProblemsModule]`.

## Authoring validation (5A)

Reuse URL preparation from `problem-url.ts` inside Learning mutations (or shared helper import from problems module **without** pulling Learning into Problems):

- Same supported platforms as `POST /problems`.
- Invalid URL → `400` / `VALIDATION_ERROR` or aligned problems codes.

## Privacy

- Learning **GET** responses for other learners must not expose whether a URL is solved on someone else’s account (enrollment-scoped learner only).
- `problemId` may appear on **owner** problem APIs; study DTOs use resolution only. **5E** backlinks: `GET /problems/:problemId/learning-references` ([LEARNING_5E_CONVENTIONS.md](./LEARNING_5E_CONVENTIONS.md)).

## Writes

All problem creates/updates stay on **ProblemsController**. Learning does not duplicate create logic.