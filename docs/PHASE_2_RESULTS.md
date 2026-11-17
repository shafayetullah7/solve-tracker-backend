# Phase 2 execution results

Date: **2026-11-10**. Status: **shared-client foundation complete; live database-backed integration remains deferred**. Phase 1's Docker/PostgreSQL blocker is unchanged. No authentication or product endpoint was added.

## Implemented

- `solve-tracker-frontend/src/lib/api/client.ts`: native-fetch transport factory with same-origin credentials, fixed `/api` prefix, safe path/query handling, JSON/text/204 responses, typed error categories, cancellation, per-attempt timeouts, and one explicitly eligible auth retry.
- `errors.ts` and `index.ts`: small public transport/error boundary.
- `modules/system.api.ts`: typed wrapper for the existing scaffold greeting only, referencing generated backend operation types and checking its text response. No fake auth/topic/problem modules or homepage requests.
- `config/api-proxy.ts` and Vite configuration: required validated development API_PROXY_TARGET; exact `/api` boundary matching; one prefix removal; original Origin and separate Set-Cookie headers retained. Static builds/tests do not require a development upstream.
- `.env.example`: documented server-only proxy target. An ignored local `.env` was created from that example because it did not exist; no existing credentials were overwritten.
- `src/configure-app.ts`: shared real-controller OpenAPI document factory used by Swagger and the exporter.
- Scaffold route: explicit text/plain response header and accurate Swagger response schema. Greeting behavior itself is unchanged.
- `scripts/export-openapi.mjs`: real AppModule contract export with only DatabaseService lifecycle replaced. Configuration validation still runs, no server listens, no database connects, and no migrations/seeds execute.
- `openapi.json` and `solve-tracker-frontend/src/lib/api/generated/backend.d.ts`: committed deterministic contracts for the existing route.
- `scripts/generate-api-types.mjs`: maintained openapi-typescript generation and drift checks.
- `solve-tracker-frontend/API_CLIENT.md`, frontend conventions/AGENTS guidance, and both READMEs: usage, boundaries, generation commands, limitations, and proxy setup.

## Recovery scope

The transport accepts an optional recoverSession callback and auth epoch getter. Recovery is off by default and also requires an explicit per-operation flag. Only `401 AUTH_REFRESH_REQUIRED` can call it, and the original request retries at most once. Retries reuse the serialized JSON body, do not cancel shared recovery with a caller signal, and reject late responses after an account change.

No JWT handling, auth provider, refresh endpoint call, cross-tab lock, session probe, or refresh scheduler has been implemented. Those remain Phases 3–4. A recovery-disabled instance will serve raw auth requests to avoid recursion.

## Tooling compatibility

- Verification used temporary Node **24.22.2** with pnpm **12.18.0**.
- Added pinned openapi-typescript **7.13.0** to backend development dependencies.
- The frontend's native TypeScript 7 lacks the compiler factory API required by this generator; generation was moved to the existing backend TypeScript **6.0.3** toolchain without downgrading either application compiler.
- The generator declares a TypeScript 5 peer range. A narrowly scoped `peerDependencyRules.allowedVersions` entry records the tested 6.0.3 compatibility; backend peer checks pass and deterministic generation/contract-change checks verify actual behavior. This exception needs review when either dependency changes.
- Added frontend Node 24 type declarations for server-side Vite configuration and proxy integration tests. Lockfiles were updated for intentional development tooling changes.

## Verification evidence

| Check | Result |
| --- | --- |
| Frontend type check, lint, production build | Passed |
| Frontend Vitest suite | **40 tests passed**, including existing UI tests |
| Real Vite proxy against isolated local HTTP upstream | Passed: path/query/JSON body, required header, Origin, incoming cookie, two distinct response cookies, exclusion of `/apix` |
| Closed/unavailable proxy upstream | Returns expected **502**; verified |
| Unsafe URL/path, query values, JSON writes, text/204 | Passed |
| Structured errors, HTML/malformed response handling | Passed |
| Network failures, timeout, pre-aborted and in-flight cancellation | Passed |
| Explicit eligible recovery, one retry, no recursion, exclusion statuses | Passed with injected fake recovery |
| Cancellation while waiting for recovery and stale-account success/failure | Passed |
| Unsupported non-JSON body rejection | Passed before fetch |
| Backend build, type check, lint | Passed |
| Backend unit tests | **22 passed** |
| Backend HTTP tests | **3 passed**; database provider replaced |
| Backend snapshot check and frontend generated-type check | Passed; unchanged input reproduces output |
| In-memory real OpenAPI response constraint change | Produced changed TypeScript output; committed snapshot was not modified by this experiment |

The proxy integration uses actual Vite and local HTTP listeners with an isolated stub. It does not establish a PostgreSQL-backed Nest connection or production proxy/cookie behavior. All test servers are closed by cleanup. No persistent verification server was started.

## Commands

After changes to real backend route schemas:

```bash
# solve-tracker-backend/
pnpm api:export
pnpm api:check

# solve-tracker-frontend/
pnpm api:generate
pnpm api:check
```

Run with the documented Node 24 runtime and dependencies installed in both projects. Generated files should be committed with their source contract changes, not edited manually.

## Remaining integration gates

- Restore Phase 1 Docker access and verify the actual backend/PostgreSQL runtime; then verify same-origin proxying to that runtime.
- Phase 3 subsequently implemented auth endpoint schemas, regenerated types, and added the typed auth API module; see PHASE_3_RESULTS.md.
- Implement the provider/shared refresh coordinator and multi-tab race tests in Phase 4. Fake recovery tests do not prove token rotation or cross-tab behavior.
- Introduce topic/problem modules with their actual backend APIs in Phases 5–6 and use installed Solid 2 data primitives in the UI.
- Validate production proxy routing, HTTPS cookies, CSRF enforcement, and private caching during the deployment/auth phases.

Phase 2's independent deliverables are complete. This does not mark Phase 1 or authentication complete.
