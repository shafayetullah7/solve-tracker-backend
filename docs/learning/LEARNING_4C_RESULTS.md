# Learning 4C — assessment block and gated completion

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`

## Delivered

- Migration `drizzle/20261127140709_learning_assessment_links_4c/` (`assessment` block type, `learning_assessment_links`)
- `assessment` block payload + link row on content replace
- `LearningModule` imports `AssessmentsModule`; gated completion via `AttemptsService.resolveGatedCompleteNodeIds`
- Gated nodes ignore manual progress; manual complete returns `GATED_COMPLETION`
- `WRITABLE_LEARNING_NODE_COMPLETION_MODES` includes `gated`
- Study UI: gated banner, assessment block launch link; structure supports gated mode

## 4C.1 conventions hardening

- [`learning-gate-assessment.validation.ts`](../src/modules/learning/learning-gate-assessment.validation.ts): link validation + batched active thresholds
- Batched gate evaluation (threshold map + max finalized scores)
- Integration: bogus/unpublished assessment links, gate reopens on higher active threshold
- [LEARNING_4C_CONVENTIONS.md](./LEARNING_4C_CONVENTIONS.md)

## Gates

| Gate | Result |
|------|--------|
| `pnpm build` | pass |
| `pnpm test` | 306 passed |
| `pnpm db:check` | pass |
| `pnpm api:check` | pass |
| `node scripts/test-learning-integration.mjs` | pass (42 assertions) |