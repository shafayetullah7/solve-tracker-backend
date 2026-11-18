# Backend CI/CD (Docker Hub)

GitHub Actions workflow: [`.github/workflows/backend-docker.yml`](../../.github/workflows/backend-docker.yml)

On every PR that touches `solve-tracker-backend/`, CI runs **lint**, **unit tests**, **Nest build**, and a **local Docker build** (no push).

On **push to `main`/`master`** or **`v*` tags**, CI runs the same checks, then **builds and pushes** the `production` Docker target from [`Dockerfile`](../Dockerfile).

Images are **not** configured with application secrets; inject env when you run the container (Compose, k8s, VPS, etc.). See [PRODUCTION.md](../PRODUCTION.md) and [`.env.example`](../.env.example).

---

## GitHub configuration (CI only)

### Secrets (Settings → Secrets and variables → Actions → **Secrets**)

| Name | Required | Description |
| --- | --- | --- |
| `DOCKERHUB_USERNAME` | **Yes** (to push) | Your Docker Hub user or organization name. |
| `DOCKERHUB_TOKEN` | **Yes** (to push) | Docker Hub **access token** ([Account settings → Security](https://hub.docker.com/settings/security)), not your account password. Scope: read/write for the target repository. |

### Variables (Settings → Secrets and variables → Actions → **Variables**)

| Name | Required | Example | Description |
| --- | --- | --- | --- |
| `DOCKERHUB_IMAGE` | **Yes** (to push) | `myuser/practice-tracker-api` | Full image name **without** registry host (workflow uses `docker.io`). Create the empty repo on Docker Hub first. |

Optional workflow tweaks (edit the YAML if you use a different default branch or registry):

| Name | Where | Notes |
| --- | --- | --- |
| Default branch | `on.push.branches` | Workflow listens to `main` and `master`. |
| Tag `latest` | `docker/metadata-action` | Applied only on the default branch push. |

**Do not** store backend app env (`DATABASE_URL`, `JWT_*`, …) in GitHub for this workflow unless you add a separate deploy job later.

---

## Image tags pushed

| Event | Tags (examples) |
| --- | --- |
| Push to `main` | `main`, `sha-abc1234`, `latest` |
| Push tag `v1.2.3` | `v1.2.3`, `1.2`, `sha-…` |
| Pull request | Build only (no push) |

Pull on your server:

```bash
docker pull myuser/practice-tracker-api:latest
```

---

## Runtime environment (deploy time — not GitHub CI)

Set these on the **container/host** when you deploy. Copy from [`.env.example`](../.env.example). Summary:

### Required (all environments)

| Variable | Notes |
| --- | --- |
| `NODE_ENV` | `production` in prod |
| `HOST` | Usually `0.0.0.0` in a container |
| `PORT` | e.g. `3000` |
| `DATABASE_URL` | Managed Postgres URL (`?sslmode=require` when needed) |
| `SWAGGER_ENABLED` | Must be `false` when `NODE_ENV=production` |
| `JWT_ACCESS_SECRET` | ≥ 32 chars; must differ from refresh |
| `JWT_REFRESH_SECRET` | ≥ 32 chars |
| `JWT_ISSUER` | e.g. `practice-backend` |
| `JWT_AUDIENCE` | e.g. `practice-api` |
| `JWT_ACCESS_TTL_SECONDS` | ≤ 3600 |
| `AUTH_SESSION_TTL_SECONDS` | ≤ 30 days |
| `PASSWORD_RESET_TTL_SECONDS` | ≤ 3600 |
| `ARGON2_MEMORY_KIB` | 19456–262144 |
| `ARGON2_TIME_COST` | 2–10 |
| `ARGON2_PARALLELISM` | 1–4 |
| `AUTH_COOKIE_SECURE` | `true` in production |
| `AUTH_ACCESS_COOKIE_NAME` | `__Host-access` in production |
| `AUTH_REFRESH_COOKIE_NAME` | `__Host-refresh` in production |
| `FRONTEND_ORIGIN` | Exact HTTPS browser origin (no path) |
| `EMAIL_DELIVERY_MODE` | `resend` in production (not `mock`) |
| `CLOUDINARY_CLOUD_NAME` | Media uploads |
| `CLOUDINARY_API_KEY` | |
| `CLOUDINARY_API_SECRET` | |
| `GOOGLE_OAUTH_ENABLED` | `true` or `false` |

### Required when `EMAIL_DELIVERY_MODE=resend`

| Variable |
| --- |
| `RESEND_API_KEY` |
| `RESEND_FROM` |

### Required when `GOOGLE_OAUTH_ENABLED=true`

| Variable |
| --- |
| `GOOGLE_OAUTH_CLIENT_ID` |
| `GOOGLE_OAUTH_CLIENT_SECRET` |
| `GOOGLE_OAUTH_REDIRECT_URI` | Must end with `/auth/google/callback`; HTTPS in production |

### Optional (Google OAuth tuning)

| Variable |
| --- |
| `GOOGLE_OAUTH_SCOPES` |
| `GOOGLE_OAUTH_PROMPT` |
| `GOOGLE_OAUTH_STATE_TTL_SECONDS` |

### Optional (Google RISC)

| Variable | Notes |
| --- | --- |
| `GOOGLE_RISC_ENABLED` | Default off |
| `GOOGLE_RISC_AUDIENCE` | When RISC on |
| `GOOGLE_RISC_JWKS_URL` | When RISC on |
| `GOOGLE_RISC_EVENT_TTL_SECONDS` | |

### Compose/local only (not needed in Hub image at runtime)

| Variable |
| --- |
| `DOCKER_DATABASE_URL` |
| `DOCKER_BIND_ADDRESS` |
| `POSTGRES_*` |

---

## Manual smoke build

```bash
cd solve-tracker-backend
docker build --target production -t practice-tracker-api:local .
docker run --rm -p 3000:3000 --env-file .env practice-tracker-api:local
```

Use a production `.env` (or `-e` flags) matching [PRODUCTION.md](../PRODUCTION.md); do not commit secrets.

---

## Migrations

The image includes `drizzle/` and app code. Run migrations against `DATABASE_URL` as a one-off job before or during rollout, for example:

```bash
docker run --rm --env-file prod.env myuser/practice-tracker-api:latest \
  pnpm db:migrate
```

(`pnpm` is available in the image; alternatively run `drizzle-kit migrate` from a CI migrate job later.)