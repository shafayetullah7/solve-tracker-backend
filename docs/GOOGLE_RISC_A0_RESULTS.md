# GOOGLE-RISC R0 — Design lock (results)

**Status:** complete (2026-11-18).  
**Plan:** [GOOGLE_RISC_PHASED_PLAN.md](GOOGLE_RISC_PHASED_PLAN.md) § R0.

## Locked decisions

| Decision | Locked value |
| --- | --- |
| Implementation style | Thin **`GoogleRiscService`** (`jose` `jwtVerify` on Security Event Tokens); **no** Passport; separate from **`GoogleOAuthService`** / OAuth `id_token` path |
| Session contract | **Unchanged** — RISC only sets `auth_sessions.revoked_at`; HttpOnly JWT cookies, `AccessGuard`, refresh coordinator unchanged |
| Webhook route | **`POST /auth/google/risc`** on Nest (`GoogleRiscController`, **not** on class-guarded `AuthController`) |
| Public delivery URL | **`{FRONTEND_ORIGIN}/api/auth/google/risc`** (browser origin + API proxy; same convention as Google OAuth callback) |
| CSRF | **No** `AuthSecurityGuard` on RISC — Google server POST; validation is SET crypto + claims, not `Origin` / `X-Requested-With` |
| Rate limiting | **Dedicated** webhook limiter in R4 — **not** login/register/oauth-start buckets |
| Success response | **202 Accepted** after valid SET decode (per [Google RISC docs](https://developers.google.com/identity/protocols/risc)) |
| Feature gate | `GOOGLE_RISC_ENABLED=false` → route **404**; requires `GOOGLE_OAUTH_ENABLED=true` when on |
| Idempotency | PostgreSQL **`risc_event_receipts`** keyed by `jti` (not in-memory) |
| Receipt retention | `GOOGLE_RISC_EVENT_TTL_SECONDS` default **2_592_000** (30 days); **purge-on-insert** removes expired rows when processing new events (R3) |
| Revocation API | **`AuthService.revokeAllSessionsForUser(userId, reason)`** — same semantics as password reset / change-password session wipe (R3 refactor) |
| Identity data | RISC **does not** delete `auth_provider_identities` or alter `password_hash` |
| JWKS | **`GoogleRiscJwksCache`** (or equivalent) from `https://accounts.google.com/.well-known/risc-configuration` — **not** OAuth OpenID `jwks_uri` alone |
| JWT `aud` | Primary: **`GOOGLE_OAUTH_CLIENT_ID`**; optional override **`GOOGLE_RISC_AUDIENCE`** |
| JWT `exp` | **Do not reject** expired SET `exp` — events are historical (Google guidance); verify signature, `iss`, `aud` |
| Subscribed events | `sessions-revoked`, `tokens-revoked`, `account-disabled` — see matrices below |
| `token-revoked` (oauth_token) | **Out of scope** — Practice does not store Google refresh tokens |
| Google vs Practice logout | **Still independent** for casual single-profile Google sign-out; RISC narrows gap when Google **sends** security events (see [GOOGLE_OAUTH_RESULTS.md](GOOGLE_OAUTH_RESULTS.md)) |
| Compliance | SET data and receipts: **security / session management only** ([RISC Terms](https://developers.google.com/identity/protocols/risc)); no analytics; minimal retention |

### Rejected alternatives (documented, not selected)

| Alternative | Why rejected |
| --- | --- |
| `POST /security/google-risc` | Prefer grouped Google auth path and single proxy prefix; ops can revisit only with strong reason |
| RISC on **`AuthController`** + CSRF exemption | Class-level `AuthSecurityGuard` risks regression; dedicated controller is clearer |
| In-memory `jti` dedupe | Fails multi-replica deployments |
| Store Google refresh tokens for `token-revoked` prefix/hash | Conflicts with GOOGLE-AUTH contract; offline scope discouraged |
| IP allowlist for Google egress | Google egress changes; crypto validation only |
| Per-request Google introspection | Inefficient; not needed for cookie session model |

## HTTP status policy

| Condition | Response | Notes |
| --- | --- | --- |
| Malformed / empty body | **400** | Not a deliverable SET |
| Unknown signing key id | **400** | Per Google validation guidance |
| Bad signature / invalid claims (except aud mismatch policy below) | **401** | Invalid SET |
| Valid SET, processing complete (incl. noop) | **202** | Google expectation |
| Valid SET, `jti` already in `risc_event_receipts` | **202** | Idempotent |
| Valid SET, no linked Practice user | **202** | Orphan Google `sub` |
| Valid SET, `aud` misconfiguration | **202** + error log | Avoid retry storm on our misconfig; fix in staging (R5) |
| Unknown event type / unsupported `subject_type` | **202** + warn log | Do not 500 |
| Transient DB failure during revoke | **500** | Google may retry |

## Event handler matrix

### Subscribed event types (stream registration — R5)

| Event type | Practice action |
| --- | --- |
| `https://schemas.openid.net/secevent/risc/event-type/sessions-revoked` | `sub` → `auth_provider_identities` (google) → `revokeAllSessionsForUser` |
| `https://schemas.openid.net/secevent/oauth/event-type/tokens-revoked` | Same |
| `https://schemas.openid.net/secevent/risc/event-type/account-disabled` | Hybrid policy — see below |

### Subject parsing

Google account events use `subject_type: "iss-sub"` with `sub` (Google account id). Map **`sub`** to `AuthProviderIdentityRepository.findByProviderSubject('google', sub)`.

### `account-disabled` (hybrid policy — locked)

| `reason` | Session revocation | Ops log |
| --- | --- | --- |
| `hijacking` | **Required** — revoke all sessions | **error** level with `sub`, `userId`, `jti` |
| `bulk-account` | **Revoke** all sessions | **warn** level — review user activity per Google suggestion |
| Missing / other | **Revoke** all sessions | **warn** level — `reason` value recorded |

Log fields (structured): `event_type`, `jti`, `provider_subject`, `user_id`, `reason`, `outcome`.

### Log `reason` strings (session revoke audit)

- `risc:sessions-revoked`
- `risc:tokens-revoked`
- `risc:account-disabled`

## Idempotency schema (R1 migration)

Table **`risc_event_receipts`:**

| Column | Type | Notes |
| --- | --- | --- |
| `jti` | `text` PK | Unique event id from SET |
| `received_at` | `timestamptz` | Receipt time |
| `event_types` | `jsonb` | Keys from `events` claim |
| `provider_subject` | `text` null | Google `sub` when present |
| `user_id` | `uuid` null FK `users.id` | When resolved |

## Request body (implementation note for R2/R4)

Google POSTs the **security event token** as a signed JWT string. Receiver must read the **raw body** on `/auth/google/risc` — today [`configure-app.ts`](../src/configure-app.ts) applies JSON parsing to all `/auth` routes, which is unsuitable for a raw JWT.

**R4 deliverable:** route-specific parser (`text` or documented `Content-Type` from Google) for `/auth/google/risc` only; do not require CSRF or `application/json`.

## Environment variables (names only — Zod in R1)

| Variable | When required | Purpose |
| --- | --- | --- |
| `GOOGLE_RISC_ENABLED` | always | `true` \| `false` |
| `GOOGLE_OAUTH_ENABLED` | when RISC on | Must be `true` |
| `GOOGLE_OAUTH_CLIENT_ID` | when RISC on | JWT `aud` validation |
| `GOOGLE_RISC_AUDIENCE` | optional | Override `aud` |
| `GOOGLE_RISC_JWKS_URL` | optional | Default from RISC well-known configuration |
| `GOOGLE_RISC_EVENT_TTL_SECONDS` | optional | Receipt retention (default 30 days) |

**R0 does not** edit `.env.example` — **R1**.

## What RISC does not change

| Scenario | Behavior |
| --- | --- |
| Casual Google sign-out in one browser | Often **no** RISC event; Practice session until logout/TTL |
| Practice **Sign out** | Unchanged — `POST /auth/logout` |
| Password-only users | No RISC-triggered revoke |
| Users with password + Google | Sessions end on handled events; **password login may still work** after session revoke unless product policy extended in a later phase |

**Product copy:** Update `GOOGLE_PRACTICE_LOGOUT_NOTE` in **R6** to mention Google **security** revocations vs local Google sign-out.

## Google Cloud / RISC stream checklist (owner: deployer — executed in R5)

1. Same GCP project as GOOGLE-AUTH OAuth client; [enable RISC API](https://developers.google.com/identity/protocols/risc) and accept RISC Terms.
2. Delivery endpoint: `https://<public-origin>/api/auth/google/risc` (HTTPS only).
3. `POST https://risc.googleapis.com/v1beta/stream:update` — set `events_requested` to the three event types above.
4. Complete **`stream:verify`** handshake against the live endpoint.
5. Staging and production: **separate** delivery URLs or streams.
6. Keep `GOOGLE_RISC_ENABLED=false` on an environment until [R4](GOOGLE_RISC_R4_RESULTS.md) is deployed, [preflight](GOOGLE_RISC_STREAM_SETUP.md) passes, and [stream:verify](GOOGLE_RISC_STREAM_SETUP.md) succeeds on that environment ([R5 results](GOOGLE_RISC_R5_RESULTS.md)).

## Requirements touchpoints (full FR edit in R6)

- Optional **Cross-Account Protection** under FR-07 addendum when RISC ships.
- [AUTH_CONVENTIONS.md](../../solve-tracker-frontend/AUTH_CONVENTIONS.md): one paragraph in **R6** — backend may revoke sessions on Google security events; client behavior unchanged (terminal invalid on next API/refresh).

## Risks and mitigations (for R1–R5)

| Risk | Mitigation |
| --- | --- |
| RISC POST blocked by CSRF | Dedicated `GoogleRiscController` without `AuthSecurityGuard` |
| Wrong JWKS for SET vs `id_token` | `GoogleRiscJwksCache` + RISC configuration document |
| JSON middleware consumes JWT body | Raw body parser for `/auth/google/risc` (R4) |
| `aud` misconfig | 202 + error log; fix in staging smoke |
| Multi-tab stale UI | Existing auth coordinator on `AUTH_SESSION_INVALID` (no RISC client state) |

## R0 non-deliverables

No database migration, `GoogleRiscModule`, `GoogleRiscController`, `GoogleRiscService`, `verify:google-risc`, `environment.ts` / `.env.example` changes, or `AuthService.revokeAllSessionsForUser` refactor.

## Next phase

**R1** — `risc_event_receipts` migration, module skeleton, `GOOGLE_RISC_ENABLED` gate, 404 when disabled. See [GOOGLE_RISC_PHASED_PLAN.md](GOOGLE_RISC_PHASED_PLAN.md) § R1.