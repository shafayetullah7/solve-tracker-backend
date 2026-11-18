# UI/UX pivot — results

**Codename:** UI/UX pivot · **Design:** [UI_UX_PIVOT.md](UI_UX_PIVOT.md) · **Execution:** [UI_UX_PIVOT_EXECUTION_PLAN.md](UI_UX_PIVOT_EXECUTION_PLAN.md)  
**Status:** **complete** (UX-1–UX-7, 2026-11-18 handoff).

## Phase summary

| Phase | Status | Deliverables (as built) |
| --- | --- | --- |
| **UX-1** | Done | [`solve-tracker-frontend/src/icons/`](../../solve-tracker-frontend/src/icons/) barrel; [`nav-active.ts`](../../solve-tracker-frontend/src/lib/app/nav-active.ts) + tests |
| **UX-2** | Done | [`AppShell.tsx`](../../solve-tracker-frontend/src/components/app/AppShell.tsx), [`AppSidebar.tsx`](../../solve-tracker-frontend/src/components/app/AppSidebar.tsx) |
| **UX-3** | Done | [`routes/app.tsx`](../../solve-tracker-frontend/src/routes/app.tsx) layout; guest chrome; [`account.tsx`](../../solve-tracker-frontend/src/routes/account.tsx) → `/app/profile` |
| **UX-4** | Done | Stats at **`/app`** ([`routes/app/index.tsx`](../../solve-tracker-frontend/src/routes/app/index.tsx)); profile at **`/app/profile`**; authenticated `/` → `/app` |
| **UX-5** | Done | Tiered [`ProblemBrowseToolbar`](../../solve-tracker-frontend/src/components/problems/ProblemBrowseToolbar.tsx); URL sync; combined filter in backend integration |
| **UX-6** | Done | Drawer a11y, sticky browse chrome, library rows, detail actions, placeholders |
| **UX-7** | Done | This file; execution plan + design doc status; conventions already describe `/app` shell |

**Route note:** Product URLs use the **`/app`** prefix (`/app`, `/app/problems`, `/app/topics`, `/app/profile`). Older plan text sometimes said `/dashboard` or top-level `/problems`; the shipped router nests product pages under `/app`.

## Acceptance (UI_UX_PIVOT §11)

1. **Sidebar routes** — Dashboard `/app`, Library `/app/problems`, Topics `/app/topics`, Profile `/app/profile`, Add problem `/app/problems/new`; icons from `src/icons/`. **Met.**
2. **`/app` stats-only home** — Dashboard components; no profile form on that page. **Met.**
3. **Profile separate** — `/app/profile` (+ account redirect). **Met.**
4. **Guest top nav** — No signed-in Library/Topics/Account in global `AuthNav`. **Met.**
5. **`/account`** — Redirects to profile experience. **Met.**
6. **Icon layout** — One component per file + barrel. **Met.**
7. **Library browse** — Tiered filters, active constraints, URL state; combined `q` + `platform` + `status` in [`test-problems-integration.mjs`](../scripts/test-problems-integration.mjs). **Met.**

## Manual smoke (spot-check)

- Guest `/`: landing, no sidebar; sign in / register work.
- Register or login (no `next=`): lands on **`/app`** with sidebar.
- Sidebar: Library, Topics, Profile, Add problem; sign out from sidebar or profile.
- `/app/problems`: search + platform + status; “More filters”; URL reflects filters.
- `/account`: reaches `/app/profile`.
- Narrow viewport: mobile menu opens drawer; Escape closes.

## Verification commands

```bash
cd solve-tracker-frontend && pnpm check && pnpm build
cd ../solve-tracker-backend && TEST_DATABASE_URL=.../practice_tracker_test pnpm verify:phase-8
```

Optional: `pnpm test:problems:integration` (backend) after combined-filter changes.

## Known limits (not regressions)

- **No Playwright** coverage for signed-in add-problem / library browse (auth e2e exists).
- **Manual axe** on `/app` still recommended ([FRONTEND_HARDENING_PHASED_PLAN.md](../../solve-tracker-frontend/docs/FRONTEND_HARDENING_PHASED_PLAN.md)).
- **Landing judges grid** is client `GET /platforms` (flush tile grid; see [PLATFORM_CATALOG_API_A4_RESULTS.md](PLATFORM_CATALOG_API_A4_RESULTS.md)) — not part of the shell pivot.
- **FR-UX doc strings** in UI_UX_PIVOT that say `/dashboard` are historical; use **`/app`** in new work.

## References

- Frontend: [FRONTEND_CONVENTIONS.md](../../solve-tracker-frontend/FRONTEND_CONVENTIONS.md) (product workspace URLs, `AppShell`, loading patterns).
- Regression baseline: Phase 8 (`pnpm verify:phase-8`).