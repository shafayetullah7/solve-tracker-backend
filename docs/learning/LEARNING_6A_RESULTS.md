# Phase 6A — Shell and navigation

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`

## Delivered

- **[`app-sidebar-nav.ts`](../../../solve-tracker-frontend/src/lib/app/app-sidebar-nav.ts)** — `buildNavItems`, `SIDEBAR_LABELS`, order per [LEARNING_6_DECISIONS.md](./LEARNING_6_DECISIONS.md)
- **[`AppSidebar.tsx`](../../../solve-tracker-frontend/src/components/app/AppSidebar.tsx)** — relabeled Overview / Problems / My guides; `IconGuides`
- **[`CreateMenu.tsx`](../../../solve-tracker-frontend/src/components/app/CreateMenu.tsx)** — New guide, Import guide (flag on), Add problem, New topic (`#topic-create-name`)
- Footer **Add problem** retained as secondary CTA below Create menu

**Backend:** none.

## Nav order (learning flag on)

Overview → My guides → Problems → Topics → Discover (if full) → Profile.

## Tests

| File | Coverage |
|------|----------|
| `app-sidebar-nav.test.ts` | Order with/without learning & discover |
| `AppShell.test.tsx` | Overview/Problems labels, Create menu, add-problem current |
| `AppSidebar.learning.test.ts` | Flag on/off for My guides + create items |

Frontend **`pnpm check`:** **454** tests (+6).

## Manual a11y checklist

| Check | Pass criteria |
|-------|----------------|
| Keyboard nav rail | Tab through Overview → … → Profile; visible focus |
| Create menu | Enter/Space opens; Esc closes; menu items reachable |
| Add problem on `/app/problems/new` | Problems row highlighted; Add problem `aria-current` |
| Mobile drawer | Open menu; trap still holds; close restores focus (existing AppShell test) |
| Flag off | No My guides link; no New/Import guide in Create menu |

## Handoff

**6B complete** — see [LEARNING_6B_RESULTS.md](./LEARNING_6B_RESULTS.md).