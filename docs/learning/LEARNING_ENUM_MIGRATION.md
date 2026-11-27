# Learning + discover + auth PG enum migration

Migration folder: `drizzle/20261127135401_pg_enums_learning_users_auth/`.

## Types introduced

| PostgreSQL type | Domain |
| --- | --- |
| `learning_block_type` | `learning_blocks.type` |
| `learning_node_completion_mode` | `learning_nodes.completion_mode` |
| `learning_import_source_kind` | `learning_import_previews.source_kind` |
| `practice_visibility` | `users.practice_visibility` |
| `practice_goal` | `users.practice_goal` (nullable) |
| `auth_provider` | `auth_provider_identities.provider` |

Redundant `CHECK ... IN (...)` constraints on these columns were dropped in the same migration. The partial index `discover_user_visibility_idx` is dropped and recreated with an enum-typed predicate (`<> 'private'::practice_visibility`) because PostgreSQL cannot alter the column while the old text comparison remains on the index.

## API contract (unchanged)

- **completion_mode:** database and read responses include `gated`; create, patch, and portable import/export remain `structural` \| `manual`.
- **source_kind:** database allows `bundle`; import preview/commit accepts `markdown` \| `json` only.

## Schema modules

Enums live under `src/database/schema/{learning,users,auth}/*.enum.ts` and are re-exported from domain barrels. Application Zod schemas import the same const arrays where values must stay aligned. Every `*.enum.ts` follows the value-object pattern in `DRIZZLE_CONVENTIONS.md`. Gate with `pnpm verify:pg-enums`. Learning SPA mirrors: `completion-modes.ts`, `block-types.ts`, `import-formats.ts` (see frontend `FRONTEND_CONVENTIONS.md` §8.1).