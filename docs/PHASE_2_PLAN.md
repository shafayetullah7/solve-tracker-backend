# Phase 2 — Typed API boundary execution plan

Status: **independent foundation executed and verified**. See [PHASE_2_RESULTS.md](PHASE_2_RESULTS.md); live backend/PostgreSQL integration remains deferred with Phase 1.

Outcome: the frontend has one reusable HTTP boundary, typed backend API definitions, and an explicit integration point for the later auth coordinator. Components continue to use Solid 2 for reactive UI while HTTP details stay in ordinary TypeScript.

References: [execution plan](../PROJECT_EXECUTION_PLAN.md), [Phase 0 contracts](PHASE_0_DECISIONS.md), [frontend conventions](../cp-frontend/FRONTEND_CONVENTIONS.md), [auth conventions](../cp-frontend/AUTH_CONVENTIONS.md), and [backend conventions](../backend/BACKEND_CONVENTIONS.md).

## 1. Dependencies and scope

Phase 1 is partially verified; Docker/PostgreSQL execution remains blocked. Transport implementation, mocked tests, type checks, and proxy verification against an isolated stub may proceed independently. Do not represent them as successful live Nest/PostgreSQL integration. Record the specific deferred live check rather than blocking all Phase 2 preparation.

Included:

- Frontend API proxy/environment configuration.
- Shared request execution, error normalization, cancellation, and a bounded recovery interface.
- Typed feature API organization and reproducible type generation from actual backend OpenAPI contracts.
- Tests and documentation for these boundaries.

Excluded:

- Auth screens/provider, Web Locks implementation, JWT issuance, or real refresh calls: Phases 3–4.
- Topic/problem endpoints, database schema changes, or sample product data.
- SSR, BFF, Axios/interceptor stacks, a new query framework, generic repositories, or a custom OpenAPI generator.

## 2. Intended files and responsibilities

```text
cp-frontend/
  .env.example                       # server-side proxy target only
  vite.config.ts                     # /api proxy and validated target
  src/lib/api/
    client.ts                        # shared transport factory and request handling
    errors.ts                        # typed transport/HTTP/contract errors
    index.ts                         # small public export surface
    generated/
      backend.d.ts                   # generated from implemented OpenAPI paths
    modules/
      auth.api.ts                    # introduced when Phase 3 contracts exist
      topics.api.ts                  # introduced with Phase 5
      problems.api.ts                 # introduced with Phase 6
  src/lib/auth/
    transport.ts                     # raw, recovery-disabled auth calls when implemented
  scripts/
    generate-api-types.*             # only if a simple package script is insufficient
```

Do not create empty feature modules or a directory of hypothetical endpoints to match this illustration. Test files sit beside their implementation. Do not move existing UI primitives or change the framework.

Dependency direction: feature API module → shared transport; later auth coordinator → raw auth transport. The recovery-enabled transport receives a coordinator callback rather than importing the auth provider. Avoid an import cycle.

## Step 2.1 — Reconcile existing contracts

- Read Phase 0's endpoint/error matrix and preserve its paths, cookie transport, error codes, and retry rules.
- Inventory current implemented endpoints. Today the scaffold root and Swagger are available; the planned auth/product endpoints are not.
- Fix only missing metadata needed to describe actual existing routes, such as the scaffold's text response, if necessary. Do not add fake product endpoints for code generation.
- Establish a small public request-options contract: path, method, query parameters, JSON body where allowed, AbortSignal, expected response format, and explicit recovery eligibility.
- Use `/api` as the browser base. Feature modules own endpoint paths/methods; components cannot override credentials or supply arbitrary upstream origins.

**Pass:** the transport requirements match the backend plan and its current limitations are documented.

## Step 2.2 — Configure the development proxy

- Add `API_PROXY_TARGET` to the frontend example environment. It is a server-side Vite value, not a `VITE_` browser-exposed variable.
- Load and validate the target for development startup: an HTTP/HTTPS origin with no credentials, query, or fragment. Require an explicit value rather than a hardcoded upstream fallback.
- Proxy `/api` and its subpaths, remove exactly that prefix, and forward to Nest. Do not match unrelated paths such as `/apix`.
- Preserve individual Set-Cookie headers. Retain the browser's original Origin for backend checks; do not rewrite it into a trusted value. Do not silently strip Secure/SameSite flags.
- Keep static production builds independent of a development-only upstream variable. Document that production requires an equivalent reverse proxy; Vite dev proxy is not production hosting.
- Preserve development port 3001, Solid plugin settings, and Tailwind setup.

**Verification:** use an isolated local stub if Nest is unavailable. Verify path/query forwarding, JSON POST/body, custom header, original Origin, separate cookie headers, and clear failure when the upstream is unavailable. Restore/stop the stub afterward.

## Step 2.3 — Implement the transport and errors

Use native fetch inside one transport, with an injectable fetch implementation for tests. No new HTTP package is needed.

- Default browser requests to same-origin credentials. Add `X-Requested-With: practice` to unsafe API operations and Content-Type JSON only when a JSON body exists.
- Construct query strings with URLSearchParams. Omit undefined values; preserve false, zero, and meaningful empty strings; define repeated-array handling explicitly when an endpoint first needs it.
- Only permit API-relative paths; reject absolute URLs, protocol-relative URLs, and path traversal that escapes the configured API base. Do not attach cookies/headers to a caller-controlled origin.
- Handle JSON, explicitly requested text, and no-content responses. A 204 returns no payload and must not trigger JSON parsing.
- Normalize HTTP failures into a typed error carrying status, safe message, optional backend code/details, and Retry-After where present. Never render an upstream HTML error page as a user message.
- Distinguish HTTP errors from network/unavailable failures, malformed response contracts, timeouts, and caller cancellation. Do not turn all of them into auth errors.
- Expose a finite request timeout through a client option, initially 15 seconds for normal API requests. Compose timeout/caller cancellation without mutating the caller's controller; clean up listeners/timers.
- Do not log full bodies, cookie headers, reset tokens, or credential-form payloads. No persistent request cache or retry/backoff subsystem.

**Pass:** deterministic tests cover success, text, empty success, safe errors, invalid JSON, query encoding, unavailable upstream, timeout, cancellation, and rejected unsafe URLs.

## Step 2.4 — Define the recovery seam, not authentication

The client accepts an optional recovery callback and an explicit per-operation eligibility flag. Recovery is disabled by default until Phase 4 installs a real coordinator. This prevents requests from silently pretending to refresh before the backend exists.

Required behavior:

1. Only `401 AUTH_REFRESH_REQUIRED` on an eligible operation may invoke the callback.
2. The callback's successful result allows one retry of the original operation with current browser cookies.
3. A second failure is returned; never recursively re-enter recovery.
4. No recovery on login/reset errors, other 401 codes, 403, 429, network failures, or 5xx responses.
5. Caller cancellation stops that caller's retry; it does not abort a recovery operation shared with other callers.
6. Capture/check an auth-context generation so delayed results can be ignored after logout/account change; the coordinator will own that generation in Phase 4.
7. Rebuild JSON request data for the retry. Unsupported streaming/upload bodies have no automatic retry contract.
8. Only retry a mutation after the agreed pre-handler auth rejection. No replay after an ambiguous network result.

Use a fake recovery callback in tests. Test the retry limit and exclusion cases now; actual shared-promise, multi-tab locking/recheck, and cookie-rotation races remain Phase 4 acceptance criteria. The transport must not add its own competing refresh scheduler or lock.

**Pass:** the callback contract is typed, recovery-free operation works, and fake recovery tests prove bounded behavior without implementing auth endpoints.

## Step 2.5 — Add reproducible backend types

- Use a maintained OpenAPI-to-TypeScript generator, such as `openapi-typescript`, selected and version-pinned during execution after checking compatibility. Do not install a separate generated runtime client unless there is a demonstrated need.
- Export a deterministic OpenAPI document from real Nest controllers and schemas; never hand-author a parallel speculative backend schema.
- Prefer a database-independent schema-export command where practical. If bootstrapping AppModule, replace only DatabaseService lifecycle with a no-op in the export context and close the app afterward. Document that this exports route contracts rather than validating a live database. It must not bypass configuration checks or run migrations/seeds.
- Generate types from that exported document. Commit the contract snapshot/types if that is the selected reproducible workflow; do not commit environment-specific server URLs or secrets.
- Add documented generation/check scripts with actual names once implemented. Do not list unimplemented commands as working setup instructions.
- Show that changing a real route schema changes generated types, and that unchanged inputs reproduce the same output.
- Generated types provide compile-time contracts, not runtime validation. Where an endpoint needs runtime verification, use an explicit decoder/schema; do not add a method that simply casts arbitrary JSON to a caller-selected generic type and calls it verified.
- Preserve enum, nullable, optional, error, and no-content distinctions. Avoid handwritten copies of generated endpoint payloads.

**Pass:** generation works for actual available routes, output is reproducible, and endpoint functions can reference generated operation/path types. Full auth payload generation is a Phase 3 follow-up; no invented auth types are committed as implemented contracts.

## Step 2.6 — Establish feature API and Solid usage conventions

Document and implement one thin API function for an existing route if needed to demonstrate the boundary. Do not wire a scaffold test call into the product home page merely to exercise it.

Feature functions own method/path/query serialization, generated input/output types, and recovery policy. They accept request cancellation/options where useful. UI components import these functions, not transport internals or fetch.

Keep the HTTP boundary framework-neutral. Actual pages can compose API functions with the installed Solid 2 patterns:

- `createMemo` for async derived reads, rendered beneath Loading/Errored boundaries.
- Explicit mutation handlers/actions using installed-version signatures, followed by targeted refresh/invalidation.
- Reactive values passed to child components; no destructured reactive props or React effect/query patterns.
- No auth recovery triggered by rendering, every route mount, or a product-data refresh.

These data patterns are guidance for later features, not a reason to install a second framework/query layer. The current client-only app must remain import-safe during static shell generation. A future SSR client would need request-scoped credentials; do not implement that unused runtime now.

Update `FRONTEND_CONVENTIONS.md`, auth documentation if its seam changes, and AGENTS guidance to state the shared-client requirement explicitly.

## Step 2.7 — Final verification and evidence

From the frontend, run build, type checking, lint, and focused/full tests as appropriate. Run affected backend checks if OpenAPI metadata/export code changed. Verify the development proxy in a real browser or HTTP integration harness, and distinguish a stub upstream from the real backend.

Record `docs/PHASE_2_RESULTS.md` during execution with implemented files, commands, generated artifacts, test results, proxy evidence, and deferred integration. No result file is created merely to imply checks passed during planning.

Before completion, verify:

- [x] One shared native-fetch transport; no product-level scattered fetch calls.
- [x] Same-origin credentials, unsafe-request headers, and validated proxy routing.
- [x] Safe response/error handling, cancellation, and bounded timeout behavior.
- [x] Typed recovery seam with one retry; no actual premature refresh implementation.
- [x] Reproducible generated types for implemented backend routes.
- [x] Feature API organization documented without fake endpoints/modules.
- [x] Solid 2 integration guidance preserves its reactive model.
- [x] Relevant checks pass and documentation reflects actual commands.
- [x] Phase 1 live-database limitations and Phase 3–4 auth follow-ups remain explicit.

Phase 2 can complete its independent client foundation with stub-based proxy evidence and real-route OpenAPI types. End-to-end proxy verification against the actual Nest runtime remains a required integration gate once Phase 1's database access is available. Do not claim the entire infrastructure or auth workflow is complete because transport tests pass.
