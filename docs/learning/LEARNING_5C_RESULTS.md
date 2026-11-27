# Learning 5C — study UX and add-to-library signoff

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`  
**Prerequisite:** [LEARNING_5B_RESULTS.md](./LEARNING_5B_RESULTS.md)

## Delivered (frontend)

- [`ProblemBlockPanel`](../../../solve-tracker-frontend/src/components/learning/blocks/ProblemBlockPanel.tsx) — platform mark, resolution badge, judge link, library CTAs
- [`problem-resolution.ts`](../../../solve-tracker-frontend/src/lib/learning/problem-resolution.ts) + [`problemNewFromStudy`](../../../solve-tracker-frontend/src/lib/problems/paths.ts)
- [`/app/problems/new`](../../../solve-tracker-frontend/src/routes/app/problems/new.tsx) — `url`, `title`, `next` query prefill; post-save navigate via `safeReturnPath(next)`
- Study [`focus` refetch](../../../solve-tracker-frontend/src/routes/app/learning/[guideId]/study/[nodeId].tsx) (debounced) after returning from problem flows
- Outline **· Practice** hint when `problemBlocks` not all solved ([`GuideOutline`](../../../solve-tracker-frontend/src/components/learning/outline/GuideOutline.tsx))

## UX matrix

| `problemResolution` | Learner UI |
|---------------------|------------|
| `unresolved` | Add to library (prefilled) + open judge |
| `linked_unsolved` | Open in library + judge + manual-solve hint |
| `solved` | View in library + judge |

Writes use existing `POST /PATCH /problems` only (no learning ensure endpoint).

## Gates (2026-11-27)

| Gate | Result |
|------|--------|
| `pnpm check` (frontend) | pass (**446** tests) |
| `pnpm test` (backend) | 317 passed (regression) |
| `node scripts/test-learning-integration.mjs` | 67 assertions (unchanged; resolution covered in 5B) |

## Handoff

**5D** may start: gated node completion AND problem links + assessments.