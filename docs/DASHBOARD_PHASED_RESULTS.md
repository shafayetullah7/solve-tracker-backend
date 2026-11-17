# Dashboard phased results (DASH-1–4)

Date: **2026-11-16**. Plan: [DASHBOARD_PHASED_PLAN.md](DASHBOARD_PHASED_PLAN.md).

## Summary

| Phase | Result |
| --- | --- |
| DASH-1 | Stats strip, toolbar pills, topic progress list |
| DASH-2 | Three-column queues (`Pick up next` / added / solved), preview loader |
| DASH-3 | `platforms[]` on `GET /progress`, platform grid + topic sort |
| DASH-4 | `GET /progress/activity`, dark activity panel, streak badge |

Live route: [`solve-tracker-frontend/src/routes/app/index.tsx`](../solve-tracker-frontend/src/routes/app/index.tsx) — **6** API calls (progress, 4× problems, activity).

## Verification (automated)

```bash
cd solve-tracker-frontend && pnpm exec tsc --noEmit && pnpm test --run
cd solve-tracker-backend && pnpm test --run
```

Dashboard-focused frontend tests include `DashboardStatsStrip`, `DashboardToolbar`, `DashboardQueueGrid`, `DashboardActivitySection`, `dashboard-sync-label`, chart/date formatters.

Vitest uses default test isolation (removed shared `isolate: false`) so auth tests stay stable under parallel runs.

## Manual smoke (signed 2026-11-16)

1. **Empty library** — stats strip empty CTA; queue columns show muted empty copy; activity panel shows “No activity in this window yet” (no zero-height chart spam).
2. **With problems** — toolbar counts match progress + untagged meta; queues show up to 5 rows; topic/platform breakdown populated; activity chart when any week has adds/solves.
3. **Re-fetch** — toolbar button reloads progress, previews, and activity in parallel after progress succeeds.
4. **Deep links** — Browse / Unsolved / Untagged pills use `browse-query` hrefs; queue footers open correct library filters.
5. **Accessibility** — one `h1`; section `h2`s for queues and activity; overall progress bar exposes `role="progressbar"`.

## Deferred / non-goals

- External platform sync (header line is **Platforms:** from library breakdown, not OAuth).
- “High priority” unsolved count (focus queue = oldest unsolved by `createdAt`).
- Dedicated analytics route / “Detailed analytics” link.
- Weekly goals (`PATCH /users/me/preferences`).

## Cleanup (2026-11-16)

Removed unused dashboard components superseded by the mockup layout (`DashboardOverallPanel`, `DashboardQuickLinks`, `DashboardPreviewGrid`, `DashboardFocusList`, `DashboardRecentLists`, `DashboardStatLink`, `DashboardActivityTable`).