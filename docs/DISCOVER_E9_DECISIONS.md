# DISCOVER E9 — Public web (D8)

**Status:** implementation record for E9. **Plan:** [PRACTICE_DISCOVERY_PHASED_PLAN.md](PRACTICE_DISCOVERY_PHASED_PLAN.md) §D8.

## Locked decisions

### Public page eligibility

| Rule | Value |
|------|--------|
| Global | `DISCOVER_MODE=full` |
| Owner | `practice_visibility` ∈ `summary`, `topics` |
| Opt-in | `users.public_web = true` |
| Failure | Identical **404** `PROFILE_NOT_FOUND` |

### Anonymous data ceiling

- Same fields as signed-in **summary** profile (header, activity, platform mix).
- **Topics** surfaces only when owner visibility is `topics`: topic board shows **public** list rows only; topic detail + problems for `is_public` topics only.
- **Never:** email, user id, notes, exact timestamps, compare/follow/copy, `viewerFollows`, `inViewerLibrary` (omit column on public problem rows).
- Profile view counters: **signed-in only** (anonymous reads do not increment).

### SEO

| Surface | `robots` |
|---------|----------|
| `/u/:handle` SSR | `noindex, nofollow` (v1) |
| `/app/u/*` | `noindex` (unchanged) |
| Sitemap | Marketing paths only — **no** practice profiles |

### Open Graph (SSR `/u/:handle`)

| Tag | Content |
|-----|---------|
| `og:title` | `@handle · Practice` |
| `og:description` | Name, solved count, optional goal label (copy deck) |
| `og:image` | Avatar URL if set, else `/og-image.jpg` |
| `og:url` | Canonical public URL `/u/{handle}` |

### Share URL

When `publicWeb` and visibility ≠ `private`: **Copy link** uses `/u/{handle}`. Otherwise `/app/u/{handle}` for signed-in Discover.

### Rate limits

`RATE_LIMIT_PUBLIC_READ_PER_MIN = 60` per client IP (`req.ip ?? socket.remoteAddress`) on all `GET /public/people/*`.

### Block and report

- `user_blocks`: viewer block list; blocked users omitted from discovery surfaces; direct profile **404** for blocker.
- `discover_reports`: `{ reporter_id, reported_user_id, reason }` admin queue; max reason 500 chars; **no** read API in E9.