# User handle — reference and acceptance

Rollup for **USER-HANDLE** (H0–H4). Phase detail: [USER_HANDLE_PHASED_PLAN.md](USER_HANDLE_PHASED_PLAN.md), [USER_HANDLE_A0_RESULTS.md](USER_HANDLE_A0_RESULTS.md), [USER_HANDLE_H1_RESULTS.md](USER_HANDLE_H1_RESULTS.md), [USER_HANDLE_H2_RESULTS.md](USER_HANDLE_H2_RESULTS.md), [USER_HANDLE_H3_RESULTS.md](USER_HANDLE_H3_RESULTS.md), [USER_HANDLE_H4_RESULTS.md](USER_HANDLE_H4_RESULTS.md).

## Summary

| Topic | Decision |
| --- | --- |
| Field | `users.handle` — **NOT NULL**, globally unique case-insensitively (`lower(handle)`) |
| Login | **Email** (+ Google); handle is identity/display, not a credential in MVP |
| Registration | Optional chosen handle; omit → **system assign** (`u` + id fragment or random fallback) |
| Google new users | System assign at create; customize in profile |
| Profile | `GET/PATCH /users/me/profile` — set or change handle; **30-day cooldown** after first change (`handle_changed_at`) |
| Session | `user.handle` (string) on register/login/session/refresh |
| Errors | `HANDLE_IN_USE` (409), `HANDLE_CHANGE_COOLDOWN` (409), Zod → 400 on `handle` |
| Public by handle | **Deferred** — no `GET /users/by-handle/:handle` or `/u/:handle` in MVP |

## Documented JSON API

Regenerate with `pnpm api:export` (backend) and `pnpm api:check` on both packages after contract changes.

| Method | Path | Handle |
| --- | --- | --- |
| `POST` | `/auth/register` | Optional body `handle` |
| `POST` | `/auth/login` | Response `user.handle` |
| `GET` | `/auth/session` | `user.handle` |
| `POST` | `/auth/refresh` | `user.handle` |
| `GET` | `/users/me/profile` | `handle` |
| `PATCH` | `/users/me/profile` | Optional `handle` (policy + uniqueness) |

Shared validation: [`user-handle.schema.ts`](../src/common/schemas/user-handle.schema.ts) (32 reserved names locked to A0).

## Operations

- **Migrations:** Run **both** handle migrations before deploying a backend that requires `users.handle` — see [PRODUCTION.md](../PRODUCTION.md) § Database.
- **Rollback:** Forward-only project; rolling back app without reversing migrations leaves extra columns/indexes (safe). Reverting NOT NULL requires a corrective migration (not shipped).
- **Google OAuth:** Unchanged; handle on same `users` row as identities.

## Automated regression

| Command | When | What it covers |
| --- | --- | --- |
| `pnpm verify:user-handle` | CI / no DB | Migrations present, schema wiring, reserved list, OpenAPI greps, Vitest slice |
| `TEST_DATABASE_URL=…/_test pnpm verify:user-handle:exit` | Pre-release | Above + full unit tests, `db:check`, handle/auth/profile integration, `api:check` both packages, frontend `pnpm test` |
| `TEST_DATABASE_URL=…/_test pnpm verify:phase-8` | Broader MVP gate | Does **not** include user-handle exit by default; run `verify:user-handle:exit` when cutting handle-related releases |

CI can run `verify:user-handle` without PostgreSQL.

## Manual acceptance checklist

Use on staging (email register + optional Google).

- [ ] Register with unique handle → session and profile show same `@handle`.
- [ ] Register duplicate handle (case variant) → 409 field error (`HANDLE_IN_USE`).
- [ ] Register without chosen handle → system handle (`u…`); nudge + customize in profile.
- [ ] Change handle within 30-day cooldown → `HANDLE_CHANGE_COOLDOWN` with clear copy.
- [ ] Google-only new user → system handle at create; customize in profile.
- [ ] `pnpm api:check` green on **backend** and **frontend**.

## Limitations (MVP)

| Item | Notes |
| --- | --- |
| Login with handle | Not supported |
| Public profile URL / API by handle | Deferred ([plan § 7](USER_HANDLE_PHASED_PLAN.md)) |
| Handle availability pre-check | Deferred; rely on PATCH/register + DB unique index |
| Handle history after rename | Not stored |
| Profanity / admin rename | Reserved list only; no moderation UI |

## Phase results index

| Phase | Doc |
| --- | --- |
| H0 Design | [USER_HANDLE_A0_RESULTS.md](USER_HANDLE_A0_RESULTS.md) |
| H1 Schema | [USER_HANDLE_H1_RESULTS.md](USER_HANDLE_H1_RESULTS.md) |
| H2 Backend API | [USER_HANDLE_H2_RESULTS.md](USER_HANDLE_H2_RESULTS.md) |
| H3 Frontend | [USER_HANDLE_H3_RESULTS.md](USER_HANDLE_H3_RESULTS.md) |
| H4 Regression | [USER_HANDLE_H4_RESULTS.md](USER_HANDLE_H4_RESULTS.md) |

## USER-HANDLE closed

Phases **H0–H4** complete for MVP. Future work: public-by-handle, login alias, search — see [USER_HANDLE_PHASED_PLAN.md](USER_HANDLE_PHASED_PLAN.md) § 7.