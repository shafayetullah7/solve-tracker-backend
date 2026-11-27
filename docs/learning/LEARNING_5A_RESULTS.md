# Learning 5A — problem block + links signoff

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`

## Delivered

- Migration `drizzle/20261127144101_chunky_lady_mastermind/` — `learning_block_type` + `problem`; table `learning_problem_links`
- Schema [`learning-problem-links.table.ts`](../../src/database/schema/learning/learning-problem-links.table.ts); enum [`learning-block-type.enum.ts`](../../src/database/schema/learning/learning-block-type.enum.ts)
- Author path: `problemPayloadSchema`, [`prepareLinkableProblemUrl`](../../src/modules/learning/learning-problem-link.validation.ts), link rows on `replaceNodeContent` and portable import
- Portable JSON: `problem` blocks with `url` + optional `label` only (export strips `normalizedUrl`)
- Frontend: `NodeContentEditor` (add/edit problem), `BlockViews` read-only link; preserves `assessment` blocks on save
- Errors: `PROBLEM_URL_INVALID`, `PROBLEM_PLATFORM_UNSUPPORTED` (catalog host required; stricter than `POST /problems` `other`)

## Gates (2026-11-27)

| Gate | Result |
|------|--------|
| `pnpm verify:pg-enums` | pass |
| `pnpm build` | pass |
| `pnpm test` | 312 passed |
| `pnpm api:check` | pass (after `api:export`) |
| `node scripts/test-learning-integration.mjs` | pass (**53** assertions) |
| `pnpm check` (frontend) | pass (**440** tests) |

## Handoff

**5B** may start: learner `problemResolution` on content/tree reads via `ProblemsLearningReadService` batch lookup.