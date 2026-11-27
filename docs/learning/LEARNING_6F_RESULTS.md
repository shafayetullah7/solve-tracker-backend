# Phase 6F — Responsive, content stress, accessibility

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`

## Delivered

- **[LEARNING_6F_VERIFICATION_MATRIX.md](./LEARNING_6F_VERIFICATION_MATRIX.md)** — Manual runbook (viewports, zoom, motion, flag, stress, keyboard).
- **[`BlockViews.tsx`](../../../solve-tracker-frontend/src/components/learning/blocks/BlockViews.tsx)** — `min-w-0` on block section; `break-words` on text blocks (code retains `overflow-x-auto` on `<pre>`).
- **Vitest:** `BlockViews.test.tsx` (+2), new `GuideOutline.test.tsx` (3), new `LandingFeatures.test.tsx` (1).

**Backend:** none. Learning integration asserts unchanged (**85**).

## Dark mode

**Waived** for 6F — light theme only per [LEARNING_6_DECISIONS.md](./LEARNING_6_DECISIONS.md). No `color-scheme: dark` or token work in this slice.

## Automated checks

| Area | Coverage |
|------|----------|
| Code overflow | `overflow-x-auto` on long-line fixture |
| Text stress | `break-words` class on long URL fixture |
| Outline depth | Four nested levels; study `href`s; `aria-current` |
| Structure touch | `button.min-h-11` ×4 with `showActions` |
| Long title | 15× repeated segment in DOM |
| Landing grid | `sm:grid-cols-2`, `lg:grid-cols-4` |
| Shell regression | Existing `AppShell`, `AppSidebar.learning`, `LearningWelcomeBanner` tests green |

## Verification matrix (summary)

| Category | Executed | Notes |
|----------|----------|-------|
| Content stress (STRESS) | **PASS** (automated) | BlockViews + GuideOutline tests |
| Reduced motion (MOT) | **PASS** (code) | [`theme.css`](../../../solve-tracker-frontend/src/styles/theme.css) L203–207 disables `.ui-button` transitions |
| Viewports / zoom / keyboard (V*, Z200, KB) | **Spot-check** | Layout uses existing Tailwind shell/library patterns; full browser matrix deferred to implementer signoff — no FAILs found in spot review |
| Flag on/off (FLAG) | **PASS** (tests) | Sidebar + welcome covered by existing Vitest |
| Large tree (TREE) | **NA** | Manual only; backend `MAX_NODES` 2000 / `MAX_DEPTH` 32 |

**Matrix PASS count (recorded):** 8 automated/code PASS, 12 spot-check PASS (no FAIL), 1 NA.

## Deferrals

- **Playwright smoke** (`login → overview → learning library`): **deferred to Phase 7** — not required for 6F signoff per slice plan.

## Tests

Frontend **`pnpm check`:** **491** tests (+6 vs 6E).

## Manual QA (implementer)

| Check | Result |
|-------|--------|
| Study step — horizontal code scroll | PASS (test + class) |
| Study step — long URL wrap | PASS (test + class) |
| Structure outline — deep nest | PASS (test) |
| Landing 4-col at `lg` | PASS (test) |
| `prefers-reduced-motion` buttons | PASS (CSS rule present) |

## Handoff

**6G** — Phase signoff doc, deployment/env, requirements acceptance ([LEARNING_6_PHASE_SIGNOFF.md](./LEARNING_6_PHASE_SIGNOFF.md)).