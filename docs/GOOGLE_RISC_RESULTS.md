# Google RISC — reference and acceptance

Rollup for **GOOGLE-RISC** (R0–R7). Phase-by-phase detail lives in `GOOGLE_RISC_R*_RESULTS.md` and [GOOGLE_RISC_PHASED_PLAN.md](GOOGLE_RISC_PHASED_PLAN.md).

## Summary

| Topic | Decision |
| --- | --- |
| Integration | Dedicated `GoogleRiscController`; `jose` SET verification; **no** Passport; separate from OAuth `id_token` path |
| Session impact | Sets `auth_sessions.revoked_at` via `AuthService.revokeAllSessionsForUser` — same as password reset |
| Delivery URL | `https://<public-origin>/api/auth/google/risc` (edge proxies `/api` → Nest `POST /auth/google/risc`) |
| Events | `sessions-revoked`, `tokens-revoked`, `account-disabled` (hybrid logging for disabled accounts) |
| Feature gate | `GOOGLE_RISC_ENABLED=false` → webhook **404**; requires `GOOGLE_OAUTH_ENABLED=true` |
| Default | **Off** until staging stream verified ([GOOGLE_RISC_R5_RESULTS.md](GOOGLE_RISC_R5_RESULTS.md)) |
| Client | No RISC-specific UI; session invalidation via existing probe / refresh / coordinator |

## Implementation status

| Phase | Status | Doc |
| --- | --- | --- |
| R0 Design | Complete | [GOOGLE_RISC_A0_RESULTS.md](GOOGLE_RISC_A0_RESULTS.md) |
| R1 Schema / skeleton | Complete | [GOOGLE_RISC_R1_RESULTS.md](GOOGLE_RISC_R1_RESULTS.md) |
| R2 SET verify | Complete | [GOOGLE_RISC_R2_RESULTS.md](GOOGLE_RISC_R2_RESULTS.md) |
| R3 Handle + revoke | Complete | [GOOGLE_RISC_R3_RESULTS.md](GOOGLE_RISC_R3_RESULTS.md) |
| R4 HTTP receiver | Complete | [GOOGLE_RISC_R4_RESULTS.md](GOOGLE_RISC_R4_RESULTS.md) |
| R5 Stream ops | Runbook complete; staging evidence | [GOOGLE_RISC_R5_RESULTS.md](GOOGLE_RISC_R5_RESULTS.md) |
| R6 Docs / copy | Complete | This file |
| R7 Verify gate | Complete | [GOOGLE_RISC_R7_RESULTS.md](GOOGLE_RISC_R7_RESULTS.md) |

Staging Google `stream:verify` and real SET evidence remain **operator-owned** until the table in [GOOGLE_RISC_R5_RESULTS.md](GOOGLE_RISC_R5_RESULTS.md) is filled.

## Receiver

| Method | Path (Nest) | Auth | Body |
| --- | --- | --- | --- |
| `POST` | `/auth/google/risc` | Google SET crypto only (no CSRF) | Raw JWT string (8KB max) |

HTTP policy: [GOOGLE_RISC_R4_RESULTS.md](GOOGLE_RISC_R4_RESULTS.md). OpenAPI: tag **Internal webhooks** (`pnpm api:check`).

## Operations

- **Local default:** `GOOGLE_RISC_ENABLED=false` — no public webhook required.
- **Production:** [PRODUCTION.md](../PRODUCTION.md) § Google RISC.
- **Stream registration:** [GOOGLE_RISC_STREAM_SETUP.md](GOOGLE_RISC_STREAM_SETUP.md).
- **Preflight:** `RISC_PUBLIC_URL=https://<origin>/api/auth/google/risc pnpm preflight:google-risc`.

### Rollback

1. Google `stream:update` with `status: disabled`.
2. `GOOGLE_RISC_ENABLED=false` and redeploy (webhook **404**).

## 6. Limitations

- **Casual Google sign-out** in one browser tab often sends **no** RISC event; Practice sessions continue until logout, TTL, or refresh failure.
- **Revoking app access** or **security events** end Practice sessions only when RISC is **enabled**, the stream is registered, and Google delivers a handled event type to the linked `sub`.
- **No Google refresh tokens** stored — granular `token-revoked` with `oauth_token` subject is out of scope.
- **Google Workspace** consumer-style signals are not a committed product guarantee.
- **Password login** may still work after session revoke unless the user had only Google auth and no password; RISC does not delete identities or passwords.
- **Frontend** has no RISC channel; tabs learn invalidation on the next API call or refresh (existing auth coordinator).
- **Compliance:** SET data and `risc_event_receipts` are for **security / session management only** ([RISC Terms](https://developers.google.com/identity/protocols/risc)); retention bounded by `GOOGLE_RISC_EVENT_TTL_SECONDS` (default 30 days).

## Manual acceptance checklist

Use on staging/production after stream registration.

- [ ] `pnpm preflight:google-risc` passes on public delivery URL.
- [ ] `stream:verify` succeeds (HTTP **202** from receiver).
- [ ] At least one real SET recorded (redacted `jti` in `risc_event_receipts` or ops logs — no full SET in logs).
- [ ] Linked user: `sessions-revoked` / `tokens-revoked` sets `auth_sessions.revoked_at`; next session probe fails.
- [ ] Duplicate `jti` redelivery → **202** without double revoke.
- [ ] Unknown Google `sub` (orphan) → **202**, no **500**.
- [ ] `GOOGLE_RISC_ENABLED=false` → **404** on webhook; OAuth login unaffected.

## Automated regression

| Command | When | What it covers |
| --- | --- | --- |
| `pnpm test` | CI | RISC unit tests (verify, handle, HTTP, limiter) |
| `pnpm verify:google-risc` | CI / no DB | Env schema, wiring, RISC Vitest dir, HTTP smoke ([R7](GOOGLE_RISC_R7_RESULTS.md)) |
| `TEST_DATABASE_URL=…/_test pnpm verify:google-risc-exit` | Pre-release | Fast verify + receipt/handle/http integration + `api:check` |
| `TEST_DATABASE_URL=…/_test pnpm test:google-risc-handle:integration` | Pre-release (à la carte) | Service revoke + idempotency |
| `TEST_DATABASE_URL=…/_test pnpm test:google-risc-http:integration` | Pre-release (à la carte) | HTTP 202 path + 404 when off |

`verify:phase-8` / `verify:phase-9` are unchanged; run `verify:google-risc-exit` explicitly when cutting a RISC-bearing release.

CI keeps `GOOGLE_RISC_ENABLED=false`; no Google egress required.

## Phase results index

| Phase | Doc |
| --- | --- |
| R0 | [GOOGLE_RISC_A0_RESULTS.md](GOOGLE_RISC_A0_RESULTS.md) |
| R1 | [GOOGLE_RISC_R1_RESULTS.md](GOOGLE_RISC_R1_RESULTS.md) |
| R2 | [GOOGLE_RISC_R2_RESULTS.md](GOOGLE_RISC_R2_RESULTS.md) |
| R3 | [GOOGLE_RISC_R3_RESULTS.md](GOOGLE_RISC_R3_RESULTS.md) |
| R4 | [GOOGLE_RISC_R4_RESULTS.md](GOOGLE_RISC_R4_RESULTS.md) |
| R5 | [GOOGLE_RISC_R5_RESULTS.md](GOOGLE_RISC_R5_RESULTS.md) |
| R7 | [GOOGLE_RISC_R7_RESULTS.md](GOOGLE_RISC_R7_RESULTS.md) |

## Related

- Google sign-in: [GOOGLE_OAUTH_RESULTS.md](GOOGLE_OAUTH_RESULTS.md)
- Independent sessions (context): [GOOGLE_OAUTH_PHASED_PLAN.md](GOOGLE_OAUTH_PHASED_PLAN.md) §6