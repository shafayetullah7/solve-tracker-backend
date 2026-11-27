# Phase 6.0 — integration baseline

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`  
**Prerequisite:** [LEARNING_5E_RESULTS.md](./LEARNING_5E_RESULTS.md)

Inventory for Phase 6 polish slices. **No product UI changes in 6.0.**

---

## Feature flag and routes

| Item | State |
|------|--------|
| Env | `VITE_LEARNING_GUIDES_ENABLED=true` enables learning UX ([`.env.example`](../../../solve-tracker-frontend/.env.example)) |
| Gate | [`LearningFeatureGate`](../../../solve-tracker-frontend/src/components/learning/LearningFeatureGate.tsx) — flag off shows disabled message + link to Overview |
| Sidebar | [`AppSidebar`](../../../solve-tracker-frontend/src/components/app/AppSidebar.tsx) injects **Guides** link only when flag on (after Topics) |
| Deep links | `/app/learning/*` reachable when flag off but page gate blocks content |

### Live frontend routes (`src/routes/app/learning/`)

| Route | Purpose |
|-------|---------|
| `/app/learning` | Library (active only in UI today) |
| `/app/learning/new` | Create guide |
| `/app/learning/import` | Import preview/commit |
| `/app/learning/:guideId` | Guide overview |
| `/app/learning/:guideId/structure` | Structure editor |
| `/app/learning/:guideId/edit/:nodeId` | Node content editor |
| `/app/learning/:guideId/study/:nodeId` | Study shell |
| `/app/learning/:guideId/assessments/:assessmentId` | Assessment author shell |

**Gap:** No top-level learner **attempt** URL (attempts flow from study assessment blocks / API). Manual QA in 6B.

---

## Shell vs design delta (→ 6A)

Design: [SHELL_DASHBOARD_DESIGN.md](../../../solve-tracker-frontend/docs/learning/SHELL_DASHBOARD_DESIGN.md)

| Area | Today | Target 6A |
|------|--------|-----------|
| Nav order | Dashboard → Library → Topics → Guides (flag) → Discover → Profile | Overview → My guides → Problems → Topics → Discover → Profile |
| Learning index | After Topics | Second after Overview |
| Create | Footer **Add problem** only | **Create menu** + retain coding shortcuts |
| Labels | Dashboard, Library, Guides | Overview, Problems, My guides |
| Icons | Guides reuses Topics icon | Distinct icon in 6A if available |
| Practice progress | On Overview (`/app`) | Stays on Overview (no `/app/progress`) |

[`nav-active.ts`](../../../solve-tracker-frontend/src/lib/app/nav-active.ts) already maps `/app/learning` → `learning` section.

---

## Overview vs design delta (→ 6B)

Design: independent domain loading, resume learning + practice queue.

| Area | Today | Target 6B |
|------|--------|-----------|
| [`routes/app/index.tsx`](../../../solve-tracker-frontend/src/routes/app/index.tsx) | Progress + previews + activity; learning **not** fetched | Add Continue learning; split load status per domain |
| Coupling | Previews/activity tied to summary load success | Retry/isolate failures per section |
| Learning APIs | Client has `list`, `enrollment`, `tree`, `resume` ([`learning-guides.api.ts`](../../../solve-tracker-frontend/src/lib/api/modules/learning-guides.api.ts)) | Fan-out from Overview |

**Backend:** List order `updatedAt desc` in [`learning-guides.repository.ts`](../../src/modules/learning/learning-guides.repository.ts). No new dashboard endpoint planned (see [LEARNING_6_DECISIONS.md](./LEARNING_6_DECISIONS.md)).

---

## Library vs design delta (→ 6D)

| Area | Today | Target 6D |
|------|--------|-----------|
| API | `search`, `status`, pagination on `GET /learning/guides` | Wired in UI |
| UI | [`learning/index.tsx`](../../../solve-tracker-frontend/src/routes/app/learning/index.tsx) — `status: active`, `pageSize: 50` only | Search field, archived filter, resume shortcuts |

**Verified (6.0):** Integration asserts list `search` + `status=archived` after lifecycle archive.

---

## Metrics (→ 6C)

| Source | Scope |
|--------|--------|
| `GET /progress/*` | Problem counts, platforms, topics, **activity weeks/streak** — coding only |
| Learning | Tree `completed`, enrollment `resumeNodeId`, guide metadata |

Locked rule: [LEARNING_6_DECISIONS.md](./LEARNING_6_DECISIONS.md). Formal contract doc in **6C**.

---

## APIs ready for Phase 6 (no migration)

| Need | Endpoint / module | Slice |
|------|-------------------|-------|
| Recent guides | `GET /learning/guides` | 6B |
| Resume | `GET/PATCH .../enrollment`, `resume` | 6B, 6D |
| Progress hint | `GET .../tree` | 6B optional |
| Library filters | `GET /learning/guides?search&status` | 6D |
| Archive | `PATCH .../lifecycle` | 6D |
| Problem backlinks | `GET /problems/:id/learning-references` | Done (5E) |

---

## Regression baseline (6.0 gates)

See [LEARNING_6_0_RESULTS.md](./LEARNING_6_0_RESULTS.md) for pinned SHAs and command results.