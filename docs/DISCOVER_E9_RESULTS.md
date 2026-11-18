# Discover E9 — Public web (D8)

**Gate:** `pnpm verify:discover-e9` (requires `TEST_DATABASE_URL` ending in `_test`, `DISCOVER_MODE=full`).

**Status:** Gate **passed** (2026-11-18).

**Decisions:** [DISCOVER_E9_DECISIONS.md](DISCOVER_E9_DECISIONS.md)

## Evidence

- Integration: `scripts/test-discover-public-integration.mjs`
- Unit: `discover-safety.service.spec.ts`
- Frontend: `ProfilePracticeVisibilityPanel.test.tsx`, `copy.test.ts`
- Anonymous API: `GET /public/people/*` with IP rate limit
- SSR: `src/routes/u/[handle].tsx` + `PeoplePublicSeo`

## Security review (required before prod)

Run the repo Security Review on **branch changes** (see `review-security` skill). Record outcome below before enabling public sharing in production.

| Date | Reviewer | Result |
|------|----------|--------|
| 2026-11-18 | Automated subagent | **Blocked** — no git repo / branch diff available in this workspace; re-run `review-security` after initializing git. |
| 2026-11-18 | Implementation review | No high-severity issues noted: public API gated by `public_web` + visibility + `DISCOVER_MODE=full`, IP rate limit on `/public/people/*`, anonymous payloads omit follow/compare/PII, block/report signed-in only. |

## Manual

- Enable **Public web page** on a sharing profile → Copy link uses `/u/{handle}`.
- Open `/u/{handle}` logged out → read-only summary, **Sign up to compare**, `noindex` + OG tags in head.
- Block on signed-in profile → subject 404 for blocker and omitted from search.