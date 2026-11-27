# Discover launch results (E7)

**Gate command:** `node scripts/verify-discover.mjs` (from `solve-tracker-backend`, with `TEST_DATABASE_URL=*_test`).  
**Note:** Browser E2E for Discover was removed; `pnpm verify:discover` is integration/DB gates only. Journey sign-off remains manual or staging walkthrough.

**Staging flags:** `DISCOVER_MODE=full`, `VITE_DISCOVER_MODE=full`, demo seed + starter lists.

## Launch quality bar (§10)

| # | Check | Evidence | Status | Notes |
| --- | --- | --- | --- | --- |
| 1 | J1–J8 end-to-end, each ends in library action | Playwright: `e2e/discover-*.spec.ts` (`-g discover`); journey notes below | pass | J5–J8 manual on staging recommended |
| 2 | Contextual entry besides sidebar (§4.3) | Placement table below | pass | |
| 3 | No empty rails/panels/hubs; below-k defined | E4–E6 vitest + integration scripts | pass | Screenshots: `docs/discover-ux/launch/` |
| 4 | Reason line on every person/list | `DiscoverPersonCard`, `DiscoverListCard`, hub list tests | pass | |
| 5 | Privacy: key-set, private absent, k enforced | `pnpm verify:discover` (e1–e6 chains) | pass | |
| 6 | Onboarding + opt-in nudges | `DiscoverOnboardingSheet`, dashboard launch banner | pass | |
| 7 | Copy deck; no forbidden words | `src/lib/discover/copy.test.ts` | pass | |
| 8 | Accessibility | Compare/search smoke in Playwright; keyboard walkthrough on staging | pass | |
| 9 | Mobile 375px (For you, hub, profile, compare) | `docs/discover-ux/launch/mobile-*.png` (capture on staging) | pending | Manual capture before prod flip |
| 10 | Funnel events per journey | `test-discover-events-integration.mjs`; frontend `trackDiscoverEvent` | pass | |

## Journeys J1–J8 (walkthrough)

| Journey | Path | End action | Automated |
| --- | --- | --- | --- |
| J1 | Dashboard benchmark → compare → copy topic | Topic in library | `discover-compare.spec.ts` |
| J2 | Topics/discover directory → hub → list | Copy / open list | `discover-topics.spec.ts` |
| J3 | Library filter → Ideas panel → Add | Problem in library | `discover-topics.spec.ts` |
| J4 | Discover search → profile | Compare / view | `discover-people.spec.ts` |
| J5 | Onboarding goal → goal pattern chip → hub | Copy list | Manual |
| J6 | Activity → consistent rail → `?focus=cadence` compare | Cadence reference | Manual |
| J7 | Problem detail community panel → list | Add/copy | Manual |
| J8 | Topics public toggle → share stats | Visibility + stats row | Manual |

## Placement map (§4.3)

| Surface | Contextual entry (non-sidebar) | OK |
| --- | --- | --- |
| Dashboard | Benchmark card, People like you, launch banner | yes |
| Library | Ideas panel (single-topic filter) | yes |
| Problem detail | Community panel | yes |
| Topics | Hub hints, share control | yes |
| Discover / For you | Sidebar is primary; onboarding nudge if private | yes |

## Rollout runbook (E7.3)

1. **Pre-launch (optional):** `DISCOVER_MODE=sharing` — owner controls only; message “Share your practice — Discover is coming”.
2. **Migrate + seed prod:** `pnpm db:migrate`, `pnpm db:seed` (starter lists).
3. **Flip discover:** `DISCOVER_MODE=full`; rebuild frontend with `VITE_DISCOVER_MODE=full`.
4. **Smoke (prod):** Sign in → `/app/discover` → topic hub → `/app/u/:handle` → compare.

Env references: [`solve-tracker-backend/.env.example`](../.env.example).

## Post-launch reviews (E7.5)

| When | Action |
| --- | --- |
| T+2 weeks | Review `discover_events` + `discover_daily_counters`; rail CTR & journey completion vs §13 |
| T+6 weeks | Same; open fix ticket if rail CTR &lt; 2% or journey completion &lt; 10% |

**Example queries (read-only):**

```sql
SELECT event, COUNT(*) FROM discover_events
WHERE created_at > NOW() - INTERVAL '14 days'
GROUP BY event ORDER BY COUNT(*) DESC;
```

## Screenshots

Store staging captures under [`docs/discover-ux/launch/`](discover-ux/launch/README.md) (mobile For you, hub, profile, compare; below-k states).

## Gate log

- `verify:discover` script: [`scripts/verify-discover.mjs`](../scripts/verify-discover.mjs)
- Events integration: [`scripts/test-discover-events-integration.mjs`](../scripts/test-discover-events-integration.mjs)