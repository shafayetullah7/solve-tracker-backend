# Phase 1 — Infrastructure verification plan

Status: **executed in part; live Docker/PostgreSQL checks blocked by OS permissions**. See [PHASE_1_RESULTS.md](PHASE_1_RESULTS.md) for evidence and resume instructions. This phase verifies the existing setup and fixes only infrastructure defects uncovered by those checks. It does not implement authentication, the API client, or product features.

References: [execution plan](../PROJECT_EXECUTION_PLAN.md), [Phase 0 decisions](PHASE_0_DECISIONS.md), [backend setup](../backend/README.md), [frontend setup](../cp-frontend/README.md), and both projects' conventions/AGENTS files.

## Outcome

A developer can install dependencies reproducibly, start Nest/PostgreSQL in Docker with watch mode, run migrations/seeds inside that running backend, run the same base scripts on the host, and run the frontend alongside it. Database data survives normal container recreation. Verification results distinguish static checks, mocked tests, real HTTP, and PostgreSQL execution.

## Step 1.1 — Inventory and preflight

From the workspace root, record:

```bash
node --version
pnpm --version
docker --version
docker compose version
docker info
```

- Use Node 24.15+ within the backend's declared `<25` range and pnpm 12.18.0. An earlier session used host Node 22; do not silently count that as meeting the backend's declared engine requirement.
- Inspect current package scripts, Compose, Dockerfile, environment schemas, migration files, and frontend Vite settings before changing anything.
- Check listening ports: frontend 3001; backend and PostgreSQL use their configured values. Do not terminate unrelated processes to free a port.
- Check whether this Compose project already has running services or an existing named database volume. Do not assume a fresh database because a migration was regenerated.
- Do not dump environment files or secret-bearing resolved Compose output into logs. Use `docker compose config --quiet` for validation.

**Pass:** supported runtimes and reachable Docker daemon, or a recorded blocker with unaffected work continuing.

**Docker access branch:** retry a sandbox-denied Docker call through the normal permission mechanism. If the OS user still lacks socket access, record that user/environment access must be fixed. Do not chmod the socket, change groups, invoke interactive sudo, or reconfigure Docker automatically. Docker CLI availability is not daemon-access verification.

## Step 1.2 — Reproducible dependencies and configuration

Run each install separately in its project directory:

```bash
pnpm install --frozen-lockfile
```

- Confirm the lockfiles remain unchanged and the selected Drizzle/Solid prerelease versions match the conventions. Do not upgrade packages during this phase.
- Review any denied dependency build scripts narrowly; do not permit every install hook or disable safeguards globally to get a green install.
- Preserve existing `.env` values. Copy the example only if no local file exists; add missing documented values without overwriting secrets.
- Verify all currently consumed runtime variables are documented, required where appropriate, and validated by Zod. Phase 0 auth variables are future implementation contracts, not mandatory variables for today's scaffold.
- Validate Compose with `docker compose config --quiet` from `backend/`.
- Verify `.env` is ignored by Git and Docker build context, and host `node_modules`/build output cannot overwrite container dependencies.
- Run an isolated invalid-configuration startup check: a deliberately invalid port/URL must stop startup before connection/listening and report field names without credential values. Do not mutate the user's `.env` to perform this check.

**Pass:** frozen installs succeed; configuration/examples agree; invalid startup fails safely; no dependency changes are introduced without an identified defect.

## Step 1.3 — Static and existing test baseline

From `backend/`:

```bash
pnpm build
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm test:e2e
pnpm db:check
```

From `cp-frontend/`:

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test --run
pnpm build
```

- Identify failures as existing defects, environment restrictions, or regressions before fixing them.
- Current backend HTTP tests replace the database provider. Passing them does not establish a live PostgreSQL connection.
- Inspect generated CSS for theme tokens and semantic utilities. Type checks/builds do not substitute for the browser checks below.
- Do not regenerate a migration just to verify infrastructure. Existing migration/snapshot checks are sufficient unless a real mismatch is found.

**Pass:** relevant static and test checks pass, or their precise blockers are recorded. Docker-independent checks should proceed even if daemon access is blocked.

## Step 1.4 — Start PostgreSQL and inspect existing state

From `backend/`:

```bash
pnpm db:start:docker
docker compose ps
```

Use `psql` inside the PostgreSQL container, with credentials sourced from its environment, for read-only inspection. Record only safe summaries:

- Database/server version, current database/schema, and health status.
- Whether `platforms` exists and, if so, its columns/constraints.
- Whether legacy `pgmigrations` or Drizzle migration-history tables exist and which migration identities are recorded. Locate history rather than assuming an empty schema.
- Whether the target is the intended development database. Stop before writes if its ownership/purpose is unclear.

The current initial migration is a plain generated `CREATE TABLE platforms`; it does not adopt a preexisting table. If the table exists without matching migration history, **do not run the migration blindly**. Record the mismatch and choose a separately identified disposable verification database, or prepare an explicit non-destructive reconciliation task. Do not silently mark migrations as applied or restore the removed compatibility SQL.

**Pass:** healthy PostgreSQL and understood target/history. If an existing target is incompatible, unrelated checks continue; its data is preserved.

## Step 1.5 — Run the backend in Docker

From `backend/`, in a retained terminal:

```bash
pnpm start:dev:docker
```

In another terminal:

```bash
docker compose ps
pnpm logs:docker
```

- Verify image build, frozen container install, non-root application execution, database readiness dependency, connection check, and Nest watch startup.
- Confirm the root endpoint returns the current scaffold response. Check `/docs` and `/docs-json` only when Swagger is enabled in the current configuration.
- Confirm environment values come from configuration, the process listens on the container-reachable host, and published ports match configuration.
- Keep logs limited to the relevant startup/health evidence; do not report full container environment or connection URLs.

**Pass:** PostgreSQL is healthy, the running backend connects, and HTTP responds through the published port.

## Step 1.6 — Live migrations and seeds

Only after Step 1.4 confirms a safe, compatible target:

```bash
pnpm db:migrate:docker
pnpm db:seed:docker
pnpm db:migrate:docker
pnpm db:seed:docker
```

- Confirm commands use `docker compose exec` in the existing backend container, not a newly created application container.
- Inspect the resulting table and migration history. For a fresh verification database, expect the platform table and one applied initial migration.
- Expect three distinct seeded slugs: codeforces, leetcode, and codechef. Repeated runs must preserve row counts and existing values.
- Verify actual rows/constraints with PostgreSQL; successful CLI output alone is insufficient evidence.
- Preserve any preexisting user/custom data. If a fresh verification database was needed, record its identity and keep migration results separate from the original database's status.

**Pass:** initial application and reruns succeed with correct persistent rows and history, without resets or duplicate data.

## Step 1.7 — Verify watch mode and persistence

- Save the exact contents of a small backend source file before a temporary edit. Change only a visible scaffold response, observe Nest recompilation, and verify the new response through HTTP.
- Restore the original contents, observe a second reload, and verify the original response. Do not leave a test endpoint or demo feature behind.
- Record seeded row values/history, then run normal Compose down/start using the documented scripts. Recheck rows and migration history after recreation.
- Do not use `down -v`, volume prune, database drops, or destructive cleanup. If other work already uses these services, defer the restart rather than disrupting it silently.

**Pass:** saved source edits reload without rebuilding dependencies; restored code responds correctly; database state survives normal recreation.

## Step 1.8 — Host/external-database path

- Stop only the Docker backend, leaving PostgreSQL running, before starting the host backend on the same configured port. Record how to restore the prior service state.
- Point host `DATABASE_URL` at the safe development/verification PostgreSQL target; keep the container-internal hostname out of host configuration.
- Using the same safe target, run:

```bash
pnpm db:migrate
pnpm db:seed
pnpm start:dev
```

- Verify host startup/database connectivity and HTTP response, then stop the host process cleanly.
- A host connection to Docker-published PostgreSQL verifies the external-URL code path; it does **not** verify a managed provider's TLS or network policy. Test a supplied remote test instance only if configured and authorized, and report that separately.
- Prefer process-scoped environment overrides or an isolated ignored test env file; do not overwrite persistent local credentials or expose URLs as logged command arguments.

**Pass:** base scripts work independently of backend-container execution. Restore the desired Docker backend state before handoff.

## Step 1.9 — Frontend alongside the backend

From `cp-frontend/`:

```bash
pnpm dev
```

- Verify port 3001 is reachable while Nest remains on its configured port.
- Check the current UI foundation, responsive layout, keyboard focus, and toggle-preview interaction in a browser when browser tooling is available.
- Make and restore a small text/style change to confirm Vite updates. Confirm no Solid diagnostics or console errors arise from these interactions.
- Verify no horizontal overflow at narrow and desktop sizes, and that theme/control styles are actually loaded.
- The API proxy and auth pages belong to later phases; their absence is not a Phase 1 failure. The current frontend does not yet consume product APIs.

**Pass:** frontend and backend run concurrently, UI assets/styles load, and development updates work. If browser tooling is unavailable, record HTTP/build verification separately and leave visual checks unverified.

## Step 1.10 — Fix, document, and hand off

Fix reproducible infrastructure defects within this phase's scope and rerun the affected checks. Do not broaden into authentication, product schemas, deployment, or dependency modernization.

Create `docs/PHASE_1_RESULTS.md` during execution with:

| Evidence category | Record |
| --- | --- |
| Environment | Runtime/tool versions; safe target identifiers |
| Dependency checks | Frozen installs and lockfile status |
| Static/test checks | Commands, pass/fail, mocked versus live scope |
| Containers | Build/start/readiness/watch behavior |
| Database | Initial migration, repeat run, seeds, history, persistence |
| Host path | External-URL execution and any unverified provider-specific behavior |
| Frontend | Concurrent operation, HMR, browser/visual checks |
| Changes | Files changed to fix identified defects |
| Outstanding work | Exact blocker, affected check, next action |

Update READMEs only where verified behavior or commands differ, and update Phase 1 status in the execution plan. Leave temporary edits restored and state which services are intentionally left running. Do not mark the phase complete while required live checks remain blocked.

## Completion checklist

- [x] Supported temporary Node 24 runtime used; frozen installs succeed. System Node still needs updating for normal host use.
- [x] Existing environment values are preserved and invalid startup is rejected safely.
- [x] Build/type/lint/tests and Compose validation pass.
- [ ] Docker backend and PostgreSQL start and communicate.
- [ ] Database target/history are understood before migrations run.
- [ ] Migrations and seeds pass initial/rerun checks on a safe target.
- [ ] Source watch mode and restoration are verified.
- [ ] Normal container recreation preserves rows and migration history.
- [ ] Host/base scripts work with an external database URL.
- [ ] Frontend alongside real Nest remains blocked; frontend HMR/browser checks passed independently.
- [x] Results, fixes, remaining limitations, and running-service state are documented.

Execution was requested and independent verification completed. Resume only the remaining affected checks after Docker access is restored.
