# Learning 5D — gated completion conventions

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`

Cross-links: assessment gate details in [LEARNING_4C_CONVENTIONS.md](./LEARNING_4C_CONVENTIONS.md); problem resolution in [LEARNING_5B_RESULTS.md](./LEARNING_5B_RESULTS.md).

## AND rule

On gated nodes, completion requires **every** linked assessment gate **and** **every** linked problem URL to be `solved` for the learner.

| Link set | Behavior |
|----------|----------|
| Assessments only | Same as 4C |
| Problems only | Complete when all URLs `solved`; assessments vacuously pass |
| Both | Both must pass |
| Neither | Never complete |

## Reopen

- Learner marks problem `unsolved` → node incomplete on next tree GET.
- Author removes problem block / link → URL no longer in gate set; remaining links still apply.

## Manual completion

`PATCH …/completion` on gated nodes returns `409 GATED_COMPLETION` (derived completion only).