# Backend conventions

This is the project-wide reference for implementing and reviewing the coding practice tracker backend. Follow these conventions for new work. They define the target implementation style; they do not imply that the product endpoints, authentication, or every supporting feature already exist.

## 1. Sources of truth and scope

| Reference | Responsibility |
| --- | --- |
| [REQUIREMENTS.md](./REQUIREMENTS.md) | Product behavior, scope, acceptance criteria, and open decisions |
| This document | Architecture, naming, API contracts, configuration, testing, and development workflow |
| [DRIZZLE_CONVENTIONS.md](./DRIZZLE_CONVENTIONS.md) | Version-specific database APIs, schema barrels, queries, migrations, and seeds |
| [MEDIA_CONVENTIONS.md](./MEDIA_CONVENTIONS.md) | User media (`media` table), Cloudinary, gallery visibility, `usage_count` slots, profile avatar linking |
| [README.md](./README.md) | Setup and runnable commands |
| `package.json` and `pnpm-lock.yaml` | Selected dependencies, scripts, and reproducible installed versions |

- Implement the requested scope. Do not add product tables, sample endpoints, integrations, authentication methods, or dependencies merely to demonstrate infrastructure.
- Follow [Phase 0 decisions](../docs/PHASE_0_DECISIONS.md) for selected authentication, ownership, and API policy; resolve only remaining affected release details before implementation.
- Keep documentation synchronized with changes to scripts, environment variables, public contracts, or architectural choices. Explain intentional deviations where they occur.

## 2. Stack and version discipline

- Use NestJS, strict TypeScript, PostgreSQL, Drizzle, Zod, and pnpm as configured in this repository.
- Use the Node version range and pnpm version declared in `package.json`. Commit `pnpm-lock.yaml`; do not introduce npm or Yarn lockfiles.
- Drizzle ORM and Kit are pinned to **1.0.0-rc.5**. Follow their 1.0 RC APIs, particularly v2 relations and timestamped migration folders. Read the Drizzle conventions before database changes.
- Verify installed declarations and the documentation for the selected version before adopting unfamiliar Nest, Drizzle, or Zod APIs. Do not silently upgrade packages to make a copied example work.
- Prefer existing dependencies and native Nest integrations. A new abstraction or package should solve a concrete requirement.
- Use the existing Express adapter unless changing it is explicitly part of the task.

## 3. Folder structure and module boundaries

Organize application features by domain. Keep infrastructure shared and product logic within its owning feature.

```text
src/
  main.ts                         # bootstrap and listening
  configure-app.ts                # common HTTP validation / documentation setup
  app.module.ts                   # application composition
  config/
    environment.ts                # Zod environment schema and inferred type
  database/
    database.module.ts
    database.service.ts           # shared pool and typed Drizzle client
    schema/
      index.ts                    # public schema barrel
      relations.ts                # v2 relation registry
      platforms/
        index.ts
        platforms.table.ts
  modules/                        # add feature folders as they are implemented
    problems/
      problems.module.ts
      problems.controller.ts
      problems.service.ts
      problems.repository.ts      # add when persistence queries need isolation
      schemas/
        create-problem.schema.ts
        list-problems.schema.ts
        problem-response.schema.ts
  common/                         # only components already shared by features
scripts/
  seed.ts
drizzle/
  <generated-migration-folder>/
    migration.sql
    snapshot.json
test/
  *.e2e-spec.ts
```

The feature and `common/` folders above are conventions for future work, not existing functionality.

- Controllers handle HTTP input, invoke application services, and return responses. Keep SQL, business rules, and transaction orchestration out of controllers.
- Services own use cases, business rules, and transaction boundaries. Keep them independent of Express request/response objects.
- Put nontrivial or reused persistence queries in concrete feature repositories. Small features may initially query through `DatabaseService`; do not create generic CRUD repositories or interfaces without a need.
- Repositories handle persistence and row retrieval. They must not read request objects, implement HTTP responses, or start transactions that undermine an existing use-case transaction.
- Import shared providers through their Nest modules; export only the providers that other modules need. Do not instantiate services with `new` in application code.
- Do not import another feature's controller or reach through its private implementation. Expose a narrow service/module interface when cross-feature behavior is needed.
- Place all database tables under `database/schema/`, including tables owned by a feature. This single schema root is an explicit project requirement.
- Use barrels for database schema discovery. Avoid blanket barrels across every module; use direct imports elsewhere to keep dependencies visible and avoid cycles.

## 4. Naming and TypeScript style

| Item | Convention | Example |
| --- | --- | --- |
| Files and directories | kebab-case, with role suffixes | `create-problem.schema.ts` |
| Nest feature files | plural domain name | `problems.service.ts` |
| Classes and types | PascalCase | `ProblemsService`, `CreateProblemInput` |
| Functions, variables, properties | camelCase | `markSolved`, `solvedAt` |
| Zod schemas | camelCase with `Schema` suffix | `createProblemSchema` |
| Environment variables | UPPER_SNAKE_CASE | `DATABASE_URL` |
| SQL tables and columns | snake_case | `problem_topics`, `solved_at` |
| Tests | colocated `*.spec.ts`; HTTP suites in `test/` | `problems.service.spec.ts` |

- Follow the repository's Prettier configuration. Keep TypeScript strictness enabled.
- Use ESM imports with `.js` suffixes for local TypeScript modules, and `import type` for type-only imports. Preserve value imports required by Nest dependency injection and runtime decorators.
- Infer API input/output types from Zod and database record types from Drizzle. Do not maintain duplicate handwritten shapes for the same contract.
- Prefer `unknown` for untrusted input and caught errors; narrow it before use. Avoid `any`, unchecked assertions, and non-null assertions used to bypass missing validation.
- Use constructor injection. Make implementation details `private` and injected dependencies `readonly` where possible.
- Await asynchronous operations or explicitly handle their rejection. Do not leave floating promises or start untracked background work during a request.
- Use explicit return types for public service/repository methods when they clarify contracts. Never cast an unknown database/HTTP result into the desired type as a substitute for validation.
- Comments explain reasons, constraints, or unusual choices. Remove obsolete comments and commented-out implementations.

## 5. Request validation and Zod contracts

- Use Zod for request and environment validation. Do not introduce a parallel class-validator DTO system for new endpoints.
- Attach schemas explicitly through native Nest parameter decorators, such as `@Body({ schema: createProblemSchema })`. The registered global `StandardSchemaValidationPipe` validates only parameters that declare a schema.
- Give body, query, and path input their own schemas. Validate them before service/database work.
- Use `z.strictObject()` for request objects so unexpected writable fields are rejected. Environment parsing deliberately allows unrelated process variables.
- Trim human-readable titles and topic names before enforcing nonempty values. Do not silently trim passwords, tokens, or meaningful URL components.
- Coerce string query/path values deliberately. Reject fractional/out-of-range limits and accept booleans only through explicit supported strings; `z.coerce.boolean()` treats `"false"` as truthy.
- Enforce field-length limits, allowed statuses, and URL protocols in schemas. Business invariants and database constraints remain necessary after input validation.
- Use explicit schemas for create, update, list, and response contracts. Share field schemas where semantics match, but do not derive a writable API contract by exposing every database column.
- Exclude identifiers, ownership, creation timestamps, and other server-managed fields from writable inputs. For PATCH, distinguish omitted fields from explicit `null`, and reject an empty update when it has no defined effect.
- Validate the final state when a partial update affects rules involving several fields.

## 6. HTTP and response contracts

- Use plural resource routes and standard HTTP methods. Avoid verb-heavy routes for ordinary CRUD operations.
- For implemented resources, use `POST` to create, `GET` to read/list, `PATCH` for partial updates, and `DELETE` to delete. A completion change can be part of a problem PATCH; do not add a second competing status API without a requirement.
- Use 201 for creation, 200 for reads/updates that return content, and 204 for deletion without content. Use 400 for invalid input, 404 for a missing resource, and 409 for a persistent uniqueness conflict.
- Return explicit public response fields. Do not spread database rows into API responses or expose secrets, internal metadata, or future ownership fields accidentally.
- Use camelCase JSON properties and ISO 8601 UTC timestamps. Document nullable values explicitly. Do not return a body with a 204 response.
- Return a resource directly for a single-resource operation. For new paginated lists, use `{ items, meta: { page, pageSize, total } }`; do not introduce a universal success wrapper or vary list shapes between features.
- New list endpoints use one-based `page`, default `pageSize=25`, and maximum `pageSize=100`. These are API conventions for future endpoints, not environment defaults. Validate sort/filter fields against allowlists and use stable ordering with a unique tie-breaker.
- Apply search/filter conditions consistently to both rows and the filtered total. Product progress summaries retain the overall/topic scope defined in the requirements.
- Preserve the distinction between an absent resource and an empty list. Return an empty `items` array for a valid list query without matches.
- Make repeated status assignments idempotent according to the product rules; do not change a completion timestamp merely because the same solved state was sent twice.

## 7. Swagger and API documentation

- Reuse Zod request schemas for native Nest Swagger generation. Do not manually duplicate request property definitions in Swagger decorators.
- Define explicit public response schemas/annotations supported by the installed Swagger version. TypeScript types alone do not describe response schemas at runtime.
- Document resource tags, operation purpose, success responses, pagination/filter semantics, and expected error statuses when implementing endpoints.
- Register common HTTP setup in `configure-app.ts`; production bootstrap and HTTP tests should use it so validation and documentation behavior stay aligned.
- Keep `/docs` and `/docs-json` controlled by the validated `SWAGGER_ENABLED` value. Do not infer exposure from a hardcoded environment fallback.

## 8. Persistence and transactions

Follow [DRIZZLE_CONVENTIONS.md](./DRIZZLE_CONVENTIONS.md) for the exact schema, relation, and migration APIs.

- Use `DatabaseService.db` and the shared pool. Standalone scripts own and close their own pools.
- Enforce uniqueness, references, and other persistent invariants in PostgreSQL as well as in application validation. A read-before-write check alone cannot prevent a concurrent duplicate.
- Use parameterized Drizzle queries. Keep dynamic identifiers and sorting on allowlists; never concatenate user-controlled SQL.
- Make multi-table changes atomic. Pass the transaction client explicitly through participating repository methods; do not accidentally use the root client inside the transaction.
- Define transaction scope around the business operation. Keep unrelated network calls outside it, and do not retry arbitrary mutations without defining their idempotency.
- Use explicit public response mapping after reading/writing. A database insert type is not an API authorization policy.
- Generate migrations on the host and apply committed files through the existing host or running-container commands. Never synchronize schema automatically on application startup.
- Keep seeds explicit, transactional, repeatable, and separate from schema changes. Do not add sample user records without a requirement.
- Do not edit applied migrations. Regeneration of an unapplied migration requires an explicit task and must not reset database contents or persisted migration history.

## 9. Configuration and Docker

- Define runtime variables in `src/config/environment.ts` and document them in `.env.example` and the README. Validate supplied process variables as well as `.env` values before database initialization and HTTP startup.
- Access configuration through typed `ConfigService<Environment, true>` and `getOrThrow`. Keep direct `process.env` reads confined to configuration/tooling entry points that validate them.
- Require explicit environment values. Do not add hardcoded application environment values or fallback defaults in Compose, bootstrap, or services.
- Compose variables use required-value expressions. Docker-only variables remain optional for host execution against an external PostgreSQL database, but must be valid if supplied.
- Never commit `.env`, include it in Docker build context, or print the full environment/connection URL on failure.
- Preserve `pnpm start:dev`, `pnpm db:migrate`, and `pnpm db:seed` for host/external-database use. Docker counterparts run the same behavior through Compose; migration and seed scripts use `exec` inside the existing backend container.
- Keep dependency installation/build output inside the image/container. Source edits should reach Nest watch mode without replacing container dependencies with host `node_modules`.
- Keep PostgreSQL data in a named volume and wait for its health check. Do not delete volumes or reset databases during routine setup or verification.
- The current Dockerfile is a development setup. Production packaging/deployment is a separate task, not an implied feature of the development Compose file.

## 10. Errors, logging, and access boundaries

- Use Nest HTTP exceptions at the application/HTTP boundary. Let the global validation pipe produce input errors consistently.
- Catch errors to recover, translate a known condition, or add useful context. Do not swallow failures or turn every error into a generic 400 response.
- Translate known PostgreSQL constraint errors using structured error codes and constraint identity, not string matching on messages. Preserve unexpected failures as server errors without returning SQL, stack traces, or credentials to clients.
- Use Nest's logger with class/use-case context. Log unexpected failures at the responsible boundary; avoid logging the same stack in every layer.
- Do not log credentials, tokens, full request bodies, or database URLs. Use safe identifiers and operation names when diagnosing failures.
- Close resources on shutdown and startup failure. Do not add process termination calls inside request-handling services.
- When accounts are implemented, derive identity from authenticated context, apply ownership checks to every operation, and verify referenced topics belong to that owner. Never trust an owner ID supplied in the body.
- Confirm the access model before exposing private tracker data. Do not assume that the current unauthenticated scaffold is a completed authorization design.

## 11. Tests and verification

- Use Vitest (`vi.fn`, `vi.mock`, etc.), not Jest APIs. Keep fixtures deterministic and isolate environment overrides with cleanup.
- Test meaningful behavior: validation boundaries, normalization, duplicate handling, completion transitions, filtered counts, transactions, and ownership when implemented. Avoid tests that only repeat implementation details.
- Unit-test business rules without a live database. HTTP tests may replace the database provider when verifying routing/validation/Swagger; label that limitation clearly.
- Use a dedicated disposable PostgreSQL test database for real database integration. Do not migrate, seed, truncate, or reset an unknown developer or production database from tests.
- Use real PostgreSQL integration tests for constraints, migrations, SQL behavior, and transaction rollback when those features change. Mocks and generated SQL do not establish database correctness.
- Test documented invalid input and error behavior as well as successful requests. Check Zod transformations and Swagger contract generation when changing shared HTTP configuration.
- Close Nest applications, pools, and servers in cleanup hooks.

Run the checks appropriate to the change from `backend/`:

```bash
pnpm build
pnpm lint
pnpm test
pnpm test:e2e
```

**PostgreSQL integration and gate scripts** live under `scripts/` and are run with `node`, not as `package.json` aliases. See [scripts/README.md](./scripts/README.md). Typical pattern:

```bash
pnpm build
export TEST_DATABASE_URL=postgresql://…/practice_tracker_test   # name must end in _test
node scripts/test-topics-integration.mjs
```

Do not add new `pnpm` scripts that only wrap `node scripts/<gate>.mjs` or duplicate `pnpm build && node scripts/…`. Keep `package.json` for Nest/Drizzle/OpenAPI tooling only.

For schema changes, also run `pnpm db:check`, review generated SQL, and verify that another `pnpm db:generate` reports no unintended changes. Apply and verify migrations against an appropriate test database. Validate Compose when changing it with `docker compose config --quiet`.

Report what was actually verified. Distinguish generation/metadata checks, mocked HTTP tests, and live PostgreSQL/container execution; disclose blocked checks rather than describing them as passed.

## 12. Review checklist

- Does the change implement an agreed requirement without unrelated scaffolding?
- Are controllers small, feature boundaries clear, and public inputs/outputs explicit?
- Are Zod validation, Swagger documentation, and TypeScript types aligned?
- Are database invariants enforced and multi-step writes atomic?
- Are secrets excluded and environment values validated without fallbacks?
- Are installed-version APIs used consistently, especially Drizzle 1.0 RC?
- Are migrations, configuration examples, conventions, and setup commands current?
- Do the relevant checks pass, with remaining limitations stated accurately?
