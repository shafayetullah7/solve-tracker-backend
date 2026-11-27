# Phase 6 — locked decisions (6.0)

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`  
**Authority:** [LEARNING_6_SLICE_PLAN.md](./LEARNING_6_SLICE_PLAN.md), [PRODUCT_INTEGRATION_DESIGN.md](../../../solve-tracker-frontend/docs/learning/PRODUCT_INTEGRATION_DESIGN.md)

Decisions below bind slices **6A–6G** unless explicitly reopened in a later phase signoff.

## Appearance

| Topic | Decision |
|-------|----------|
| Dark mode | **Waived** for Phase 6. Slice **6F** verifies responsive/a11y on **light** theme only. Revisit post-6 or Phase 7. |
| Theme tokens | No `theme.css` dark palette work in 6.x. |

## Navigation and IA (6A)

| Topic | Decision |
|-------|----------|
| Primary labels | **Overview** (not Dashboard), **Problems** (not Library), **My guides** (not Guides), **Topics**, conditional **Discover**, **Profile** |
| Nav order (flag on) | Overview → My guides → Problems → Topics → Discover → Profile |
| Learning placement | My guides is **second** item after Overview when `VITE_LEARNING_GUIDES_ENABLED=true` |
| Create menu | Entries: **New guide**, **Import guide**, **Add problem**, **New topic** — no R2 placeholders |
| Add problem | Keep direct **Add problem** on coding library surfaces and in Create menu; do not remove footer CTA until 6A ships menu |
| `/app/progress` route | **No** dedicated route in 6.x; practice analytics stay on Overview |

## Overview (6B)

| Topic | Decision |
|-------|----------|
| Section order (flag on, mixed user) | **Continue learning** block **above** practice queue and coding stats |
| Section order (flag off) | Coding-first dashboard unchanged |
| Loading | **Independent** load/error/empty per domain (learning vs practice summary vs activity); one failure must not block others |
| Recent guides | `GET /learning/guides` default sort (`updatedAt` desc); fan-out `enrollment` per guide for resume — **no** new dashboard aggregate API in R1 |
| Empty learning library | CTA create/import; must not hide or block problem CTAs |

## Metrics (6C precursor)

| Topic | Decision |
|-------|----------|
| `GET /progress/activity` | **Coding solves only** — unchanged semantics |
| Learning progress | Guide list, tree `completed`, `resumeNodeId` — **not** merged into solve streak or weekly solve buckets in Phase 6 |
| Combined score | **No** single “productivity percentage” widget in 6.x |

## Guide library (6D)

| Topic | Decision |
|-------|----------|
| List API | Use existing `search`, `status` (`active` / `archived`), pagination — no migration |
| Archived UX | Archived tab/filter; lifecycle API already exists |

## Feature flag

| Topic | Decision |
|-------|----------|
| `VITE_LEARNING_GUIDES_ENABLED` | Remains env-driven through Phase 6 |
| Flag removal | Phase 7 beta / launch decision, not 6G |

## Backend scope

| Topic | Decision |
|-------|----------|
| New APIs | None required for 6.0–6D baseline; optional list `sort` query only if 6B fan-out is unacceptable (default: **client composition OK**) |

## Formal activity contract

Slice **6C** published [LEARNING_6_ACTIVITY_CONTRACT.md](./LEARNING_6_ACTIVITY_CONTRACT.md) with edge-case detail; metrics rows above are locked at 6.0.