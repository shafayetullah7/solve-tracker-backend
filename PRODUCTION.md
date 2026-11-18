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

## Verification

```bash
cd solve-tracker-backend
pnpm verify:phase-9
```

This runs unit/e2e tests (including health), build, and OpenAPI drift check. It does not deploy or send email.