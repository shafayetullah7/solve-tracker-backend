# USER-HANDLE H0 — Design lock (results)

**Status:** complete (2026-11-18).  
**Plan:** [USER_HANDLE_PHASED_PLAN.md](USER_HANDLE_PHASED_PLAN.md) § H0.

## Locked decisions

| Decision | Locked value |
| --- | --- |
| Field model | Column **`users.handle`** (`text`, nullable); distinct from **`name`** (display) and **`email`** (credential) |
| Login credential | **Email** and password, or Google OAuth — **not** handle in MVP |
| Uniqueness | Case-insensitive; partial unique index **`UNIQUE (lower(handle)) WHERE handle IS NOT NULL`** (H1) |
| Storage & API | **Canonical lowercase** in PostgreSQL and in JSON responses |
| Format | 3–24 Unicode code points; ASCII `[a-zA-Z0-9_]` only; must start and end with letter or digit; trim outer whitespace; reject interior spaces |
| Registration | **Optional** `handle` on `POST /auth/register`; omit → `NULL` |
| Google-only / linked | New Google users: **`NULL`** until claimed in profile; **no** auto-generated or suggested handles in product UI |
| Existing deployments | **`NULL` handle allowed** indefinitely; soft nudge in UI only; **no** hard gate on library CRUD |
| First-time set | No cooldown |
| Change policy | After handle is set, **at most one change per 30 days**; enforce via **`users.handle_changed_at`** (H1) |
| Availability API | **Deferred** — MVP uses register/profile PATCH only (no `GET …/handle-availability`) |
| Public practice profile | **Scheduled** — DISCOVER E3+ (`/app/u/:handle`, signed-in); see [PRACTICE_DISCOVERY_PHASED_PLAN.md](PRACTICE_DISCOVERY_PHASED_PLAN.md) |
| Session / JWT | **Unchanged** — `AccessGuard` and purposes unchanged; handle is profile/session payload only |
| UI display | Product may show **`@handle`**; API returns bare `handle` string |
| Google / RISC | No OAuth or RISC changes; handle on same `users` row |

### Rejected alternatives (documented, not selected)

| Alternative | Why rejected |
| --- | --- |
| Login with handle instead of email | Enumeration and recovery complexity; defer |
| Public vanity URL in MVP | Private workspace first; H0 only reserves names |
| Auto-handle from Google `name` | Wrong UX vs Codeforces-style choice; collisions |
| Required handle at signup | FR-07 keeps three **required** fields; friction for legacy users |
| Pre-check uniqueness without insert | TOCTOU; rely on DB unique index + `HANDLE_IN_USE` |
| Store user-typed casing with case-insensitive unique | H0 sign-off: store lowercase only |
| Unlimited handle changes | Abuse and impersonation risk; 30-day cooldown locked |
| Separate `profiles` table for handle | Unnecessary; scalars stay on `users` with bio/avatar |

## Identity fields compared

| Field | Role | Unique? | Login? |
| --- | --- | --- | --- |
| `email` | Credential, recovery | Yes (normalized lower) | Yes |
| `name` | Display name | No | No |
| `handle` | Public stable id | Yes (case-insensitive) | No (MVP) |

## Reserved handles

H1 **`USER_HANDLE_RESERVED`** (or equivalent in `user-handle.schema.ts`) **must match this set exactly** (all entries compared after `toLowerCase()`).

### Product / route audit (2026-11-18)

| Handle | Rationale |
| --- | --- |
| `account` | Frontend `/account` |
| `admin` | Common admin prefix |
| `api` | API proxy prefix |
| `app` | Frontend `/app` workspace |
| `auth` | Backend `auth/*`, frontend auth flows |
| `dashboard` | App home UX name (`/app` dashboard) |
| `discover` | FR-10 Discover workspace routes (`/app/discover`, future APIs) |
| `edit` | Dynamic route segment `…/edit` |
| `forgot` | Forgot-password flow (segment) |
| `google` | `auth/google` OAuth |
| `health` | Backend `GET /health` |
| `help` | Common support path |
| `login` | Frontend `/login` |
| `logout` | Auth action |
| `me` | Backend `users/me` profile API |
| `media` | Backend `media/*` |
| `new` | `…/new` routes |
| `null` | Literal confusion |
| `password` | Reset/forgot copy |
| `platforms` | Backend `platforms` catalog |
| `practice` | Product name |
| `problems` | Frontend `/app/problems`, API `problems` |
| `profile` | Frontend `/app/profile` |
| `progress` | Backend `progress` summaries |
| `register` | Frontend `/register` |
| `reset` | Reset-password flow |
| `risc` | `auth/google/risc` webhook |
| `root` | Common reserved |
| `settings` | Future settings |
| `support` | Common reserved |
| `topics` | Frontend `/app/topics`, API `topics` |
| `u` | Public practice profile prefix `/app/u/:handle` (DISCOVER E3+) |
| `users` | Profile API prefix `users/me` |
| `www` | Common reserved |

**Alphabetical canonical list for H1 tests:**  
`account`, `admin`, `api`, `app`, `auth`, `dashboard`, `discover`, `edit`, `forgot`, `google`, `health`, `help`, `login`, `logout`, `me`, `media`, `new`, `null`, `password`, `platforms`, `practice`, `problems`, `profile`, `progress`, `register`, `reset`, `risc`, `root`, `settings`, `support`, `topics`, `u`, `users`, `www`

## API contract (forward reference — H2 implements)

Current shapes (no `handle` today):

- [`userSchema`](../src/modules/auth/schemas/auth.schema.ts): `id`, `name`, `email`
- [`profileResponseSchema`](../src/modules/profile/schemas/profile.schema.ts): `name`, `bio`, `avatarUrl`, work, education

| Method | Path | Change |
| --- | --- | --- |
| `POST` | `/auth/register` | Optional body field `handle` |
| `POST` | `/auth/login` | Response `user.handle` optional or null |
| `POST` | `/auth/register` | Same response shape as login |
| `GET` | `/auth/session` | `user.handle` optional or null |
| `POST` | `/auth/refresh` (or equivalent) | `user.handle` optional or null |
| `GET` | `/users/me` profile | `handle` optional or null |
| `PATCH` | `/users/me` profile | Optional `handle` to set or change |

**Types:** `handle` is `string | null` in JSON; omitted on wire only before H2 if still null (prefer explicit `null` in OpenAPI when implemented).

**Deferred:** `GET /users/me/handle-availability?handle=…`

## Error codes & HTTP mapping (H2)

| Code | HTTP | When | `details` |
| --- | --- | --- | --- |
| `HANDLE_INVALID` | 400 | Format, reserved, or empty after normalize | `{ handle: string }` record |
| `HANDLE_IN_USE` | 409 | PostgreSQL `23505` on `lower(handle)` | `{ handle: string }` record |
| `HANDLE_CHANGE_COOLDOWN` | 409 | Change within 30 days of `handle_changed_at` | `{ handle: string }` optional message with days remaining |
| Zod / global pipe | 400 | Request shape failures | Issue array (existing pipe) |

Map profile/register field errors in the frontend via [`map-api-field-errors`](../../solve-tracker-frontend/src/lib/forms/map-api-field-errors.ts).

## Privacy and abuse

- Expose handle only on authenticated **session** and **profile** responses, not on forgot-password or public error paths.
- Do not log handle changes at info level with PII beyond audit `userId` (H2 logging TBD).
- Rate limits (H2): reuse **register** and **profile PATCH** buckets in [`auth-security.guard.ts`](../src/modules/auth/auth-security.guard.ts); no separate handle-only bucket unless abuse observed.

## Requirements touchpoints

- [REQUIREMENTS.md](../REQUIREMENTS.md) **FR-07**: optional unique handle; addendum **USER-HANDLE**.
- Acceptance criterion **#21** (optional handle without breaking email-only registration).

## H1 handoff checklist

| Item | Spec |
| --- | --- |
| Column | `users.handle` `text` **NULL** |
| Column | `users.handle_changed_at` `timestamptz` **NULL** |
| Index | Partial unique on `lower(handle)` where not null |
| Module | `src/common/schemas/user-handle.schema.ts` (or `src/modules/profile/user-handle.schema.ts`) — normalize to lower, reserved set above, format rules |
| Tests | Vitest: valid/invalid/reserved/case collision; reserved list **byte-for-byte** vs this doc |
| Backfill | **None** — production users may stay `NULL` |

## H2 amendments (2026-11-18 — API policy)

Supersedes nullable / “NULL until claimed” rows above for **runtime API** after migrations `20261118102214` + `20261118103421`:

| Topic | H2 locked behavior |
| --- | --- |
| Storage | `users.handle` **NOT NULL**; JSON always returns **string** `handle` on user + profile |
| Registration | Request field `handle` **optional**; omit/empty → **system assign** (`u` + 23 hex from user id, else random `r…`) |
| Google new user | **System assign** at account creation (same as register without handle) |
| Profile change | `PATCH /users/me/profile` with `handle`; **no cooldown** when `handle_changed_at` is null; **30-day cooldown** after a successful change that sets `handle_changed_at` |
| Errors | `HANDLE_IN_USE` (409), `HANDLE_CHANGE_COOLDOWN` (409); format/reserved → 400 field `handle` |

H0 nullable wording remains historical context for H0 sign-off only.

## Next phase

**H2** — complete; see [USER_HANDLE_H2_RESULTS.md](USER_HANDLE_H2_RESULTS.md). **H3** — [USER_HANDLE_PHASED_PLAN.md](USER_HANDLE_PHASED_PLAN.md) § H3: frontend UX.