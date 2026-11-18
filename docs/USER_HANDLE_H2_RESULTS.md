# USER-HANDLE H2 — Backend API and auth integration (results)

**Status:** complete (2026-11-18).  
**Plan:** [USER_HANDLE_PHASED_PLAN.md](USER_HANDLE_PHASED_PLAN.md) § H2.  
**Policy:** [USER_HANDLE_A0_RESULTS.md](USER_HANDLE_A0_RESULTS.md) § H2 amendments.

## Pre-landed vs completed in H2

| Area | Notes |
| --- | --- |
| Pre-landed (post-H1) | `createUserAccount`, `registerSchema.handle`, `safeUser.handle`, profile GET/PATCH `handle`, cooldown + `HANDLE_IN_USE` |
| Completed in H2 | Policy docs, `user-handle.errors.ts`, Vitest (`profile.service.spec`, `auth-handle.spec`), integration assertions, OpenAPI + API types, this doc |

## API surface

| Method | Path | Handle behavior |
| --- | --- | --- |
| `POST` | `/auth/register` | Optional body `handle`; omit → system assign |
| `POST` | `/auth/login` | Response `user.handle` (string) |
| `GET` | `/auth/session` | `user.handle` (string) |
| `POST` | `/auth/refresh` | `user.handle` (string) |
| Google OAuth register | (internal) | `createUserAccount` without handle → system assign |
| `GET` | `/users/me/profile` | `handle` (string) |
| `PATCH` | `/users/me/profile` | Optional `handle`; validation + cooldown + uniqueness |

**System assign:** [`user-handle-assign.ts`](../src/common/schemas/user-handle-assign.ts) — `systemHandleFromUserId(id)` then `generateRandomSystemHandle()` on rare collision.

## Error codes

| Code | HTTP | When | `details` |
| --- | --- | --- | --- |
| `HANDLE_IN_USE` | 409 | `23505` on `users_handle_lower_uniq` | `{ handle: string }` |
| `HANDLE_CHANGE_COOLDOWN` | 409 | Change within 30 days of `handle_changed_at` | `{ handle: string }` |
| (Zod) | 400 | Format / reserved on register or profile | Field `handle` |

Constants: [`user-handle.errors.ts`](../src/common/schemas/user-handle.errors.ts).

## OpenAPI / types

| Artifact | Path |
| --- | --- |
| Contract | `openapi.json` (regenerated) |
| Types | Generated via `pnpm api:types` |

## Verification

| Command | Result |
| --- | --- |
| `pnpm build` | Pass |
| `pnpm test` | 207 tests pass |
| `pnpm api:check` | Pass |
| `pnpm api:types:check` | Pass |
| `TEST_DATABASE_URL=…/_test pnpm test:auth:integration` | Pass (handle register/session/OpenAPI) |
| `TEST_DATABASE_URL=…/_test pnpm test:profile:integration` | Pass (GET/PATCH + conflict) |
| `TEST_DATABASE_URL=…/_test pnpm test:user-handle:integration` | Pass |

## Next phase

**H3** — frontend register/profile/session UX; see [USER_HANDLE_PHASED_PLAN.md](USER_HANDLE_PHASED_PLAN.md) § H3.