# Production configuration (codebase)

Hosting-specific packaging (images, reverse proxy, secrets store) is chosen at deploy time. The application enforces production policy through environment validation.

## Required when `NODE_ENV=production`

See commented block in [`.env.example`](.env.example). Summary:

- `SWAGGER_ENABLED=false`
- `AUTH_COOKIE_SECURE=true` with `__Host-access` and `__Host-refresh` cookie names
- `FRONTEND_ORIGIN` must be `https://…` (exact origin, no path)
- `EMAIL_DELIVERY_MODE=resend` with `RESEND_API_KEY` and `RESEND_FROM`
- Independent `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (≥ 32 bytes each)

Validation lives in [`src/config/environment.ts`](src/config/environment.ts). A fixture used in tests is [`test/production-environment.ts`](test/production-environment.ts).

## Health checks

| Path | Purpose |
| --- | --- |
| `GET /health` | Liveness — returns `{ "status": "ok" }`, no database I/O |
| `GET /health/ready` | Readiness — `SELECT 1` via PostgreSQL; `503` if unavailable |

Both responses set `Cache-Control: no-store`.

## Database

- Run `pnpm db:migrate` before starting new backend versions.
- **Learning guides:** private-guide APIs ship with the learning schema migrations; there is **no** separate backend feature flag. Frontend visibility is controlled at build time via `VITE_LEARNING_GUIDES_ENABLED` ([LEARNING_6_PHASE_SIGNOFF.md](docs/learning/LEARNING_6_PHASE_SIGNOFF.md)).
- **Rollforward:** do not drop learning tables in production; fix schema forward with new migrations. App rollback = prior container + frontend flag off ([LEARNING_7D_RESULTS.md](docs/learning/LEARNING_7D_RESULTS.md)).
- **Learning beta (ops):** staging checklist, rate-limit env tuning, and probe/smoke steps — [LEARNING_7F_RESULTS.md](docs/learning/LEARNING_7F_RESULTS.md).
- **Learning beta (data rights):** export scope, account erasure API, and operator feedback env — [LEARNING_7G_RESULTS.md](docs/learning/LEARNING_7G_RESULTS.md).
- **Learning beta (rollout):** staging smoke, cohort widen, rollback — [LEARNING_BETA_RUNBOOK.md](docs/learning/LEARNING_BETA_RUNBOOK.md) ([LEARNING_7H_RESULTS.md](docs/learning/LEARNING_7H_RESULTS.md)).
- **Backups:** use logical dumps (`pg_dump`); restoring the database does not restore external media bytes. Rehearsal script: `node scripts/rehearse-learning-migration-upgrade.mjs` (see [scripts/README.md](scripts/README.md)).
- **User handles:** deploy **both** migrations `drizzle/20261118102214_add-user-handle` (nullable rollout) and `drizzle/20261118103421_backfill-user-handle-not-null` (backfill + `NOT NULL` + unique index) before starting an app build that expects `users.handle` on every row. Skipping the second migration leaves nullable handles and breaks register/session contracts. Details: [docs/USER_HANDLE_RESULTS.md](docs/USER_HANDLE_RESULTS.md).
- `pnpm db:seed` only inserts shared platform reference rows (idempotent); it does not create users.
- Use TLS in `DATABASE_URL` when the provider requires it.

## Frontend same-origin API

The Vite dev proxy is development-only. In production, terminate TLS at your edge and forward:

- Static assets → built `solve-tracker-frontend` client bundle
- `/api/*` → backend (strip or rewrite prefix per [`AUTH_CONVENTIONS.md`](../solve-tracker-frontend/AUTH_CONVENTIONS.md))

Set backend `FRONTEND_ORIGIN` to the public browser origin.

## Google OAuth (optional)

Enable only when Google Cloud credentials and redirect URIs are configured. Full behavior: [docs/GOOGLE_OAUTH_RESULTS.md](docs/GOOGLE_OAUTH_RESULTS.md).

### Google Cloud Console

- Create an **OAuth 2.0 Web client**.
- **Authorized redirect URI** must match `GOOGLE_OAUTH_REDIRECT_URI` exactly, typically  
  `https://<public-origin>/api/auth/google/callback` (browser uses the same origin; the edge proxies `/api` to Nest).

### Environment

| Variable | Production notes |
| --- | --- |
| `GOOGLE_OAUTH_ENABLED` | `true` only when client id/secret and redirect URI are set |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | From secret store; never commit |
| `GOOGLE_OAUTH_REDIRECT_URI` | `https` origin aligned with `FRONTEND_ORIGIN` + `/api/auth/google/callback` |
| `FRONTEND_ORIGIN` | Public browser origin (no path); must match cookie `Secure` policy |
| `AUTH_COOKIE_SECURE` | Must be `true` in production |
| `SWAGGER_ENABLED` | `false` (OAuth redirect routes are not in OpenAPI either) |

### Frontend build

Rebuild the SPA with `VITE_GOOGLE_OAUTH_ENABLED=true` when the backend flag is on. Mismatched flags hide or show Google UI without matching server support.

### Rollback

Set `GOOGLE_OAUTH_ENABLED=false` and rebuild frontend with `VITE_GOOGLE_OAUTH_ENABLED=false`. OAuth routes return 404; password auth and existing identity rows are unaffected.

## Google RISC — Cross-Account Protection (optional)

Receiver is implemented in R4; **stream registration** is an ops task (R5). Full steps: [docs/GOOGLE_RISC_STREAM_SETUP.md](docs/GOOGLE_RISC_STREAM_SETUP.md).

### Delivery URL

Google POSTs a Security Event Token (JWT string) to:

`https://<public-origin>/api/auth/google/risc`

The edge must proxy `/api` to Nest the same way as OAuth. No CSRF headers; raw JWT body (8KB cap).

### Environment

| Variable | Production notes |
| --- | --- |
| `GOOGLE_RISC_ENABLED` | `true` only after staging `stream:verify` and sign-off ([GOOGLE_RISC_R5_RESULTS.md](docs/GOOGLE_RISC_R5_RESULTS.md)) |
| `GOOGLE_OAUTH_ENABLED` | Required `true` when RISC is on |
| `GOOGLE_OAUTH_CLIENT_ID` | Primary SET `aud` |
| `GOOGLE_RISC_AUDIENCE` | Optional override if Google assigns a distinct receiver id |
| `GOOGLE_RISC_EVENT_TTL_SECONDS` | Optional receipt retention (default 30 days) |

### Preflight (no Google API)

```bash
RISC_PUBLIC_URL="https://<public-origin>/api/auth/google/risc" pnpm preflight:google-risc
```

Empty POST → **400** when RISC enabled; **404** when disabled.

### Rollback

1. `stream:update` with `status: disabled` in Google Cloud (stop delivery).
2. `GOOGLE_RISC_ENABLED=false` and redeploy (webhook **404**).

## Verification

```bash
cd solve-tracker-backend
pnpm verify:phase-9
```

This runs unit/e2e tests (including health), build, and OpenAPI drift check. It does not deploy or send email.