# DISCOVER E5 — Topics and material

## Migrations

- `discover_public_topic_name_idx` on `topics(normalized_name)` where `is_public = true`
- `discover_problem_normalized_url_idx` on `problems(normalized_url)`
- Migration: `drizzle/20261118171443_discover-topic-material-idx`

## EXPLAIN (after demo + starter seed on `_test`)

Hub list query uses partial index on `topics.normalized_name` with eligible-public-topic join; commonly-tracked uses `discover_problem_normalized_url_idx` on `problems.normalized_url`.

## APIs

- `GET /discover/topics`, hub, lists, problems, topic-hints, problem community
- `goalPattern` on `GET /discover/for-you`
- `moreLists` on public topic header

## Verification

```bash
TEST_DATABASE_URL=postgresql://.../practice_test pnpm verify:discover-e5
```

## UX sign-off

Screenshots: `docs/discover-ux/e5/` (directory, hub, hints, ideas, community, goal pattern) — capture when reviewing locally with `DISCOVER_MODE=full`.