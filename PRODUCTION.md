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

## Verification

```bash
cd solve-tracker-backend
pnpm verify:phase-9
```

This runs unit/e2e tests (including health), build, and OpenAPI drift check. It does not deploy or send email.