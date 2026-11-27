# Phase 7 — locked decisions (7.0)

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`  
**Authority:** [LEARNING_7_SLICE_PLAN.md](./LEARNING_7_SLICE_PLAN.md), [LEARNING_7_0_BASELINE.md](./LEARNING_7_0_BASELINE.md)

Decisions below bind slices **7A–7I** unless explicitly reopened in [LEARNING_7_PHASE_SIGNOFF.md](./LEARNING_7_PHASE_SIGNOFF.md).

Reopens [LEARNING_6_DECISIONS.md](./LEARNING_6_DECISIONS.md) **Appearance / dark mode** for Phase 7 scope only.

## Appearance

| Topic | Decision |
|-------|----------|
| Dark mode | **Waived through 7H beta.** No `theme.css` dark palette in 7A–7G. Optional **7E** manual contrast pass on **light** only; full A0-06 deferred to post-beta or 7I reopen. |
| Theme tokens | Light theme remains release default for beta cohort. |

## Testing and quality

| Topic | Decision |
|-------|----------|
| Playwright (7E) | **Waived** — not in repo. Regression: Vitest, backend/frontend integration scripts, `verify-ssr-2` when `E2E_LIVE=1`; staging browser smoke manual. |
| Vitest browser | Optional; not a 7.0 gate. |
| Supported browsers (7E) | Chrome + Firefox (latest); Safari (one major back); mobile WebKit smoke on staging. |
| 6F matrix | Execute in **7E**; record PASS/FAIL in 7E RESULTS. |

## Beta and flag

| Topic | Decision |
|-------|----------|
| Staging | `VITE_LEARNING_GUIDES_ENABLED=true` in build; full learning smoke. |
| Production pre-beta | Flag **false** in build; backend migrations may still be applied. |
| Beta cohort | **Named users** / invite list via rebuild — no runtime flag toggle without new build. |
| Flag removal | **Optional** for 7I signoff; decision in **7H**. Not required to close Phase 7 R1. |

## Performance (7C)

| Topic | Decision |
|-------|----------|
| Budgets | Adopt **subset** from [PERFORMANCE_BUDGETS.md](./PERFORMANCE_BUDGETS.md): list, tree, progress rollup, assessment history reads. |
| Stress tree | Manual/synthetic to `MAX_NODES` 2000 — not CI-seeded by default. |
| Load harness | Add `scripts/` harness only when 7C identifies a reproducible bottleneck. |

## Security and privacy (7A / 7B)

| Topic | Decision |
|-------|----------|
| Rate limits | **Incremental 7A:** import + attempt-start routes first; document remaining SECURITY doc limits as follow-up in 7A RESULTS. |
| Privacy tests | **New** `test-learning-privacy-integration.mjs` in **7B** (do not bloat `test-learning-integration.mjs`). |
| Cross-account policy | Preserve **404** for inaccessible foreign IDs (no existence leak). |

## Operations (7F / 7G)

| Topic | Decision |
|-------|----------|
| Logging | No answer keys, note text, or tokens in application logs (verify in 7F). |
| Export/delete | Learning rows follow account erasure coordination in **7G**; no new public APIs. |

## Audit register ownership (appendix)

See [LEARNING_7_0_BASELINE.md](./LEARNING_7_0_BASELINE.md) §Audit register A01–A15. **7A may start** after [LEARNING_7_0_RESULTS.md](./LEARNING_7_0_RESULTS.md).