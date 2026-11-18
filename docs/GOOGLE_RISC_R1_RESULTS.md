# GOOGLE-RISC R1 — Schema and module skeleton (results)

**Status:** complete (2026-11-18).  
**Plan:** [GOOGLE_RISC_PHASED_PLAN.md](GOOGLE_RISC_PHASED_PLAN.md) § R1.  
**Design lock:** [GOOGLE_RISC_A0_RESULTS.md](GOOGLE_RISC_A0_RESULTS.md).

## Database

| Change | Detail |
| --- | --- |
| Migration | `drizzle/20261118092718_stiff_scarlet_witch/migration.sql` |
| Table | `risc_event_receipts` — `jti` PK, `received_at`, `event_types` jsonb, `provider_subject`, `user_id` FK → `users` (ON DELETE SET NULL) |
| Index | `risc_event_receipts_received_at_idx` on `received_at` |
| Drizzle | `risc-event-receipts.table.ts`; `relations.ts` registry |

## Environment

| Variable | Notes |
| --- | --- |
| `GOOGLE_RISC_ENABLED` | `true` / `false`; default off in `.env.example` and `test/auth-env.ts` |
| `GOOGLE_RISC_AUDIENCE` | Optional `aud` override |
| `GOOGLE_RISC_JWKS_URL` | Optional; default RISC well-known in service |
| `GOOGLE_RISC_EVENT_TTL_SECONDS` | Optional; service default **2_592_000** (30d) |

Validation: `googleRiscEnvironmentSchema` + `superRefine` in `src/config/environment.ts` — RISC requires `GOOGLE_OAUTH_ENABLED` and `GOOGLE_OAUTH_CLIENT_ID`.

## Module map

| Piece | Path |
| --- | --- |
| Module | `GoogleRiscModule` |
| Controller | `GoogleRiscController` — `POST /auth/google/risc` (no `AuthSecurityGuard`) |
| Service | `risc/google-risc.service.ts` — `isEnabled`, `audience`, `jwksConfigurationUrl`, `eventTtlSeconds` |
| Repository | `risc/risc-event-receipt.repository.ts` — `existsByJti`, `create`, `deleteReceivedBefore` |
| Constants | `risc/google-risc.constants.ts` |
| Wiring | `AuthModule` imports `GoogleRiscModule` |

## Feature gate (HTTP)

| `GOOGLE_RISC_ENABLED` | `POST /auth/google/risc` |
| --- | --- |
| `false` | **404** (`NotFoundException`) |
| `true` | **501** + `{ code: NOT_IMPLEMENTED }` (skeleton until R4) |

No raw JWT body parser yet (`configure-app.ts` unchanged).

## Verification

| Command | Result |
| --- | --- |
| `pnpm db:check` | Pass |
| `pnpm db:migrate` | Applied on dev DB |
| `pnpm test` | 135 tests pass (incl. `environment.spec`, `google-risc.service.spec`) |
| `TEST_DATABASE_URL=…/_test pnpm test:risc-receipts:integration` | 3 checks pass |

## Next phase

**R2** — SET validation (`GoogleRiscService.verifySet`), JWKS cache for RISC configuration, unit fixtures. See [GOOGLE_RISC_PHASED_PLAN.md](GOOGLE_RISC_PHASED_PLAN.md) § R2.