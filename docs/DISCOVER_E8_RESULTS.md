# Discover E8 — Follow (D7)

**Gate:** `pnpm verify:discover-e8` (requires `TEST_DATABASE_URL` ending in `_test`, `DISCOVER_MODE=full`).

## Decisions

| Topic | Choice |
|-------|--------|
| Following rail on For you | People page only (`rail=following`); no For-you rail in E8 |
| Private followees | Rows kept in `user_follows`; omitted from `GET /users/me/following` and `rail=following` |
| `@starter` | Follow returns 404 (same as profile view rules) |
| Block list (D8) | Following does not filter blocked users until D8 |

## Evidence

- Integration: `scripts/test-discover-follow-integration.mjs`
- Frontend: `PeopleFollowButton.test.tsx`, `copy.test.ts`
- Backend unit: `follows.service.spec.ts`

## Manual

- Journey J4: Search → profile → Follow (pressed state + `discover_follow` event on success).