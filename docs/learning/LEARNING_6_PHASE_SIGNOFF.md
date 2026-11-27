# Phase 6 — Product integration and polish (R1 signoff)

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`  
**Slice plan:** [LEARNING_6_SLICE_PLAN.md](./LEARNING_6_SLICE_PLAN.md)

## Scope delivered

| Slice | Results | Contracts / artifacts |
|-------|---------|------------------------|
| 6.0 — Baseline, decisions | [LEARNING_6_0_RESULTS.md](./LEARNING_6_0_RESULTS.md) | [LEARNING_6_0_BASELINE.md](./LEARNING_6_0_BASELINE.md), [LEARNING_6_DECISIONS.md](./LEARNING_6_DECISIONS.md) |
| 6A — Shell, sidebar, Create | [LEARNING_6A_RESULTS.md](./LEARNING_6A_RESULTS.md) | `app-sidebar-nav.ts`, learning flag nav |
| 6B — Overview continue learning | [LEARNING_6B_RESULTS.md](./LEARNING_6B_RESULTS.md) | Parallel dashboard loaders |
| 6C — Dual metrics | [LEARNING_6C_RESULTS.md](./LEARNING_6C_RESULTS.md) | [LEARNING_6_ACTIVITY_CONTRACT.md](./LEARNING_6_ACTIVITY_CONTRACT.md) |
| 6D — Library search, archive | [LEARNING_6D_RESULTS.md](./LEARNING_6D_RESULTS.md) | `library-query.ts`, `GuideLibraryWorkspace` |
| 6E — Landing, onboarding | [LEARNING_6E_RESULTS.md](./LEARNING_6E_RESULTS.md) | `landing-copy.ts`, `LearningWelcomeBanner` |
| 6F — Responsive / stress / a11y | [LEARNING_6F_RESULTS.md](./LEARNING_6F_RESULTS.md) | [LEARNING_6F_VERIFICATION_MATRIX.md](./LEARNING_6F_VERIFICATION_MATRIX.md) |

**Feature flag:** `VITE_LEARNING_GUIDES_ENABLED` (frontend build-time; see §Deployment).

**API client:** [`learning-guides.api.ts`](../../../solve-tracker-frontend/src/lib/api/modules/learning-guides.api.ts) generated from Nest `LearningModule` OpenAPI.

## Exit criteria (roadmap Phase 6)

| Criterion | Evidence |
|-----------|----------|
| Existing users continue practice workflow unchanged in substance | `test-problems-integration.mjs` (66 assertions); `test-topics-integration.mjs` (16); flag-off: [`AppSidebar.learning.test.tsx`](../../../solve-tracker-frontend/src/components/app/AppSidebar.learning.test.tsx) |
| New learning-only users onboard without creating coding problems | `test-learning-integration.mjs` (85) — create guide, tree, study lifecycle; 6E welcome + library empty states |

## Integration journeys (manual reference)

| Persona | Steps | Automated anchor |
|---------|-------|------------------|
| Practice-only | Flag off → Overview, Problems library, solve flow | Sidebar hides My guides; no continue-learning block ( Vitest + gate copy) |
| Learning-first | Flag on → create guide → add steps → study → optional problem link | Learning integration + 5C/5D UI tests |
| Mixed user | Separate labeled metrics on Overview; no merged streak | [LEARNING_6_ACTIVITY_CONTRACT.md](./LEARNING_6_ACTIVITY_CONTRACT.md); 6C copy tests |

## Gates (recorded 2026-11-27)

| Gate | Command | Result |
|------|---------|--------|
| Backend lint | `pnpm lint` (backend) | pass (existing warnings only) |
| Backend build | `pnpm build` | pass |
| Backend unit | `pnpm test --run` | **327** passed |
| DB schema check | `pnpm db:check` | pass |
| OpenAPI | `pnpm api:check` (backend) | pass |
| Frontend | `pnpm check` (frontend) | **491** passed |
| Frontend build | `pnpm build` (frontend) | pass |
| API types | `pnpm api:check` (frontend) | pass |
| Migrations idempotent | `pnpm db:migrate` (×2) | pass |
| Learning integration | `node scripts/test-learning-integration.mjs` | pass (**85** assertions) |
| Problems integration | `node scripts/test-problems-integration.mjs` | pass (**66** assertions) |
| Topics integration | `node scripts/test-topics-integration.mjs` | pass (**16** assertions) |
| Flag on nav | `AppSidebar.learning.test.tsx` | pass |
| Flag off nav | same | pass |

Pinned refs: [BASELINE_RUN.md](./BASELINE_RUN.md).

## Screenshots checklist

Formal multi-viewport archive **waived** ([PHASE_0_1_CLOSURE.md](./PHASE_0_1_CLOSURE.md)). Spot-check / matrix:

| Surface | Route | Status |
|---------|-------|--------|
| Landing dual-product | `/` | Spot-check (6E tests + 6F grid) |
| Overview | `/app` | Spot-check (6B/6E) |
| Library | `/app/learning` | Spot-check (6D) |
| Study | `/app/learning/:id/study/:nodeId` | 6F matrix STRESS rows |
| Structure | `/app/learning/:id/structure` | 6F matrix KB/STRESS |

Full viewport runbook: [LEARNING_6F_VERIFICATION_MATRIX.md](./LEARNING_6F_VERIFICATION_MATRIX.md).

## Deployment

| Environment | Backend | Frontend |
|-------------|---------|----------|
| Local dev | Migrations applied; API on :3000 | `VITE_LEARNING_GUIDES_ENABLED=true` in `.env` for learning UX |
| Staging | Deploy + migrate learning schema | Build with flag `true`; smoke `/app/learning`, overview continue learning |
| Production (pre-beta) | Same migrations | Default flag **false** in build until Phase 7 beta; **rebuild** to toggle (no runtime switch) |

Details: [solve-tracker-frontend/docs/DEPLOY.md](../../../solve-tracker-frontend/docs/DEPLOY.md), [`.env.example`](../../../solve-tracker-frontend/.env.example). Backend: no separate learning feature flag — APIs available when migrations are applied ([PRODUCTION.md](../../../solve-tracker-backend/PRODUCTION.md)).

## Explicitly deferred

| Item | Target |
|------|--------|
| Dark / system theme for learning surfaces | Waived Phase 6 ([LEARNING_6_DECISIONS.md](./LEARNING_6_DECISIONS.md)); full release still tracks A0-06 |
| Playwright E2E smoke | Phase 7 ([LEARNING_6F_RESULTS.md](./LEARNING_6F_RESULTS.md)) |
| Remove `VITE_LEARNING_GUIDES_ENABLED` | Phase 7 beta / launch |
| Public guide publishing | R2+ (A0-02) |
| Combined activity API | Documented separation only; aggregate API deferred |
| Requirements §8 full release gates (both themes, full E2E) | Phase 7+; see [LEARNING_REQUIREMENTS.md](./LEARNING_REQUIREMENTS.md) §10 |

## Policy summary

- **Navigation:** My guides second when flag on; coding routes unchanged when flag off.
- **Metrics:** Learning completion and solve activity remain separate ([LEARNING_6_ACTIVITY_CONTRACT.md](./LEARNING_6_ACTIVITY_CONTRACT.md)).
- **Backend:** No Phase 6-only API additions; list search/archive wired in UI only.

Phase 6 R1 is **complete** on `feature/learning-guides`. Next: **Phase 7** — public release hardening (security, perf, beta flag rollout).