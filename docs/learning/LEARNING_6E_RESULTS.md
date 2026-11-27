# Phase 6E — Landing, onboarding, marketing copy

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`

## Delivered

- **[`landing-copy.ts`](../../../solve-tracker-frontend/src/components/landing/landing-copy.ts)** — Dual-product hero, SEO, four feature panels (Guides, Library, Topics, Overview), privacy bullets aligned with [LEARNING_6_ACTIVITY_CONTRACT.md](./LEARNING_6_ACTIVITY_CONTRACT.md).
- **[`LandingFeatures.tsx`](../../../solve-tracker-frontend/src/components/landing/LandingFeatures.tsx)** — Responsive `sm:2` / `lg:4` grid.
- **[`learning-product-copy.ts`](../../../solve-tracker-frontend/src/lib/learning/learning-product-copy.ts)** — Library subtitle, study problem hint, welcome banner strings.
- **[`LearningWelcomeBanner.tsx`](../../../solve-tracker-frontend/src/components/dashboard/LearningWelcomeBanner.tsx)** — Dismissible Overview strip (`learning.welcome.v1`) when learning flag on.
- **In-app:** library header subtitle, [`ProblemBlockPanel`](../../../solve-tracker-frontend/src/components/learning/blocks/ProblemBlockPanel.tsx) hint, friendlier [`LearningFeatureGate`](../../../solve-tracker-frontend/src/components/learning/LearningFeatureGate.tsx) flag-off copy.

**Backend:** none. Learning integration asserts unchanged (85).

**Assets:** `public/og-image.jpg` unchanged; `ogImageAlt` and meta description updated.

## Copy principles (contract-safe)

| Claim | Allowed |
|-------|---------|
| Separate guide progress vs solve streak | Yes |
| Manual problem solve | Yes |
| Combined productivity / unified streak | No |

## Tests

| File | Coverage |
|------|----------|
| `learning-product-copy.test.ts` | In-app strings |
| `landing-copy.test.ts` | SEO/hero/features + no unified metric |
| `LearningWelcomeBanner.test.tsx` | Render, dismiss, storage |
| `LandingSeo.test.tsx` / `LandingPage.test.tsx` | Regressions (hero title updated) |

Frontend **`pnpm check`:** **485** tests (+9).

## Manual QA checklist

| Check | Criteria |
|-------|----------|
| Guest `/` | Hero/features mention guides + problems |
| Page source | Updated meta description |
| Overview (flag on) | Welcome banner; dismiss persists |
| Flag off | No welcome banner |
| Study problem block | Hint about library vs chart |
| Library | New subtitle |

## Handoff

**6F** — Responsive/a11y pass on landing four-column features at 360/768/1440; verify welcome banner focus order.