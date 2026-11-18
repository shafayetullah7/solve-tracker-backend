# Backend development

Implementation references: [Backend conventions](./BACKEND_CONVENTIONS.md),
[Drizzle conventions](./DRIZZLE_CONVENTIONS.md), and
[product requirements](./REQUIREMENTS.md).

Use Node.js 24.15+ and pnpm 12.18.0 for host commands. Docker development requires Docker Engine and Docker Compose v2+ with permission to access the Docker daemon.

## Run everything in Docker

From `solve-tracker-backend/`, copy the example environment file once and start the stack:

```bash
cp .env.example .env
pnpm docker:dev:build
pnpm docker:dev
```

The backend runs at `http://localhost:3000`. PostgreSQL is available on `localhost:5432`. Nest watches the mounted `src/` directory using polling, including on Docker Desktop. Dependencies and build output stay inside the image/container. This Dockerfile is for development.

In another terminal, also from `backend/`, apply migrations and seed:

```bash
pnpm db:migrate:docker
pnpm db:seed:docker
```

These commands use `docker compose exec -T backend` and require the backend container to be running. They use the exact same base scripts as host development. Drizzle configuration, migrations, and seed files are mounted, so edits are immediately available inside the container. The initial migration creates the `platforms` reference table; seeding inserts Codeforces, LeetCode, and CodeChef. Repeating either command does not duplicate data. The rest of the problem-tracking schema is future work.

```bash
pnpm logs:docker
pnpm docker:down
```

Normal shutdown preserves the PostgreSQL named volume. PostgreSQL initialization credentials apply only when that volume is empty; editing credentials in `.env` does not change an existing database user's password.

Run `pnpm docker:dev:build` after dependency or Dockerfile changes, then `pnpm docker:dev`. After environment changes, stop and restart the stack to recreate the backend. Source changes are picked up automatically via Nest watch (`start:dev` in the container).

## Run on the host or use an external database

Set `DATABASE_URL` in `.env` to your PostgreSQL connection URL, then:

```bash
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm start:dev
```

For a local database with only PostgreSQL in Docker, run `pnpm db:start:docker` first. For an external database, Docker is unnecessary. Include your database provider's TLS parameters in `DATABASE_URL` when required; migration commands retain certificate verification.

`DATABASE_URL` is used by host commands. Compose overrides it inside the backend with `DOCKER_DATABASE_URL`, whose default hostname is the Compose service `postgres`. Keep the credentials/database name in that URL consistent with `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`. Percent-encode special characters in URL credentials. Changing `POSTGRES_PORT` changes the PostgreSQL listening and published port; update both database URLs to match. Changing `PORT` changes the backend listening and published port. Environment variables already exported by the shell take precedence over `.env`.

The backend checks its database connection at startup and closes the pool on shutdown. It does not automatically run migrations or seeds.

## Environment validation and API schemas

Zod 4.6.7 validates startup configuration through Nest's native `ConfigModule` Standard Schema support. The application stops before connecting to PostgreSQL or listening for HTTP requests when a required variable is missing or invalid. There are no application configuration defaults. Other shell environment variables are allowed.

| Variable | Validation / purpose |
| --- | --- |
| `NODE_ENV` | Required: `development`, `test`, or `production` |
| `HOST` | Required: IP address or hostname to listen on; use `0.0.0.0` in Docker |
| `PORT` | Required: integer string from 1 to 65535; also used for the Compose published port |
| `DATABASE_URL` | Required: `postgres://` or `postgresql://` URL with hostname and database name |
| `SWAGGER_ENABLED` | Required: literal `true` or `false`; converted to a boolean |
| `DOCKER_BIND_ADDRESS` | Required by Compose: published host IP address |
| `DOCKER_DATABASE_URL` | Required by Compose: internal PostgreSQL URL, passed to the backend as `DATABASE_URL` |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Required by Compose: database initialization settings |
| `POSTGRES_PORT` | Required by Compose: integer port from 1 to 65535 |

Compose-only fields are optional for host development with an external database, but validated when present. Compose uses required-variable expressions and has no literal environment values or fallback values. Example values live in `.env.example`. Keep `HOST=0.0.0.0` for container access and use `DOCKER_BIND_ADDRESS` to control host exposure.

The backend reads typed, validated values through `ConfigService`. Validation errors identify fields without printing credentials. Seeds and migrations remain explicit commands.

Nest's global `StandardSchemaValidationPipe` validates parameters that declare Zod schemas. Define request contracts once:

```typescript
import { Body, Post } from '@nestjs/common';
import { z } from 'zod';

const createProblemSchema = z.strictObject({
  title: z.string().trim().min(1),
  url: z.url(),
});
type CreateProblemInput = z.infer<typeof createProblemSchema>;

// Inside a controller:
@Post()
create(@Body({ schema: createProblemSchema }) input: CreateProblemInput) {
  // Pass the validated input to the application service.
}
```

This is a usage example, not an implemented problem endpoint. Declare schemas for all future body/query/path inputs; the global pipe cannot validate a parameter that has no schema. Prefer `z.strictObject()` when unknown request fields should be rejected.

With `SWAGGER_ENABLED=true`, Swagger UI is available at `/docs` and the generated OpenAPI JSON at `/docs-json`. With `false`, neither is registered. Nest Swagger 12 converts Zod 4.2+ schemas through Standard JSON Schema directly, so request validation and documentation share one definition without a third-party DTO adapter. Response contracts still need explicit response schema annotations; TypeScript types alone do not describe runtime schemas.

References: [Nest configuration](https://docs.nestjs.com/application/configuration), [Nest validation](https://docs.nestjs.com/application/validation), [Nest Swagger and Zod](https://docs.nestjs.com/openapi/introduction#standard-schema-zod-valibot), [Zod releases](https://www.npmjs.com/package/zod?activeTab=versions).

## Drizzle schema and migrations

Read [DRIZZLE_CONVENTIONS.md](./DRIZZLE_CONVENTIONS.md) before changing database code. ORM and Kit 1.0.0-rc.5 are pinned. Use their v2 relation APIs and current migration format. Schema definitions live in domain folders under `src/database/schema/`, exported through domain barrels and the root `index.ts`. Runtime and Kit both consume that root barrel.


```bash
pnpm db:generate --name=add-problems
pnpm db:check
pnpm db:migrate:docker
```

Drizzle Kit generates timestamped folders under `drizzle/`, each containing `migration.sql` and `snapshot.json`; commit both. Generate on the host because this folder is mounted read-only in Docker. Use `pnpm db:migrate:create --name=data-backfill` for custom SQL. Rollbacks use new corrective migrations; there is no automatic down command. Do not edit applied migrations.

After applying migrations that add `problems.platform_slug`, run `pnpm db:seed` (or `db:seed:docker`) to backfill slugs on existing problems, or `pnpm db:backfill:platform-slugs` when you only need to re-derive slugs after catalog changes. Full PLATFORM-CLS gate: `TEST_DATABASE_URL=…/_test pnpm verify:platform-cls` (chains P1–P4 + frontend catalog). See [docs/PLATFORM_CLASSIFICATION_PHASED_PLAN.md](docs/PLATFORM_CLASSIFICATION_PHASED_PLAN.md). **PLATFORM-API** (catalog from API): [docs/PLATFORM_CATALOG_API_PHASED_PLAN.md](docs/PLATFORM_CATALOG_API_PHASED_PLAN.md) — **A4 complete** (consumer migration); next **A5** (remove static catalog).

The initial platform migration was regenerated from the current schema. It contains generated table creation SQL without legacy compatibility logic. Generating migrations does not apply them or change database history.

## Verification

```bash
pnpm build
pnpm test
pnpm test:e2e
pnpm lint
```

The HTTP test suite replaces the database provider and runs without PostgreSQL. To verify database integration, start Docker, migrate twice, seed twice, and inspect the three unique rows in `platforms`. Edit a source file and confirm Nest recompiles and restarts. Stop/start the stack and confirm the rows persist.

## Docker troubleshooting

If Docker reports permission denied for `/var/run/docker.sock`, configure Docker daemon access for your user before running these scripts. The package scripts do not invoke sudo.

If ports conflict, change `PORT` or `POSTGRES_PORT` in `.env`. Environment secrets and host `node_modules` are excluded from the image build context.

---

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm add -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

To add it to this project, run this and approve the code it prints at [observe.nestjs.com/link](https://observe.nestjs.com/link) - signing up for free if you have no account:

```bash
$ npx @nestjs/observe link
```

It installs `@nestjs/observe`, wires it into `AppModule` and `main.ts`, and writes the app key and secret into `.env`, which every `nest start` script (`start`, `start:dev`, `start:debug`) then loads. In production, set `OBSERVE_APP_KEY` and `OBSERVE_APP_SECRET` in the environment instead.

Or do it by hand:

```bash
$ pnpm add @nestjs/observe
```

Then follow the [setup guide](https://docs.nestjs.com/observability/sdk) - it takes a single import and an app key.

The free plan needs no payment details and covers 300,000 events a month. You can also browse the [live demo](https://www.observe-demo.nestjs.com/dashboard) first - the whole dashboard over a busy service's data, with nothing to install.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observe](https://observe.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

## OpenAPI contract snapshot

Run `pnpm api:export` to build and export real controller metadata to `openapi.json` without connecting to PostgreSQL (DatabaseService is replaced only in the exporter). Configuration is still validated. `pnpm api:check` verifies the committed snapshot. This is not live endpoint/database verification. From the frontend, `pnpm api:generate` / `pnpm api:check` generate/verify TypeScript contracts using the backend-owned toolchain. See [API_CLIENT.md](../solve-tracker-frontend/API_CLIENT.md) for versions and usage.

## Authentication (Phase 3)

Implemented routes are `/auth/register`, `/auth/login`, `/auth/session`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, and `/auth/reset-password`. The frontend development proxy exposes them under `/api/auth/*`. Registration creates an account without login cookies; login establishes the session. Product ownership guards are available through `AccessGuard` for future feature modules.

Add the authentication variables documented in `.env.example` before startup/export. Generate independent random signing secrets (at least 32 random bytes each); the example deliberately leaves them blank. Do not copy deterministic test fixture secrets into a real environment. The local ignored `.env` has development-only signing keys and `EMAIL_DELIVERY_MODE=mock`; existing database settings were preserved.

Development uses non-Secure `practice_access` / `practice_refresh` HttpOnly cookies for the configured HTTP origin. Production requires HTTPS, Secure `__Host-access` / `__Host-refresh`, and real Resend configuration. Every unsafe auth request needs the exact configured Origin and `X-Requested-With: practice`; body-bearing requests require JSON and are limited to 16 KiB. Visit the frontend through its configured origin (normally `http://localhost:3001`), not an alternate hostname, when exercising auth.

JWT access expires after 600 seconds, capped by the session's absolute seven-day deadline. Refresh rotates without extending that deadline. Server-side session checks enforce immediate revocation. Replay revokes the session, so browser single-flight/cross-tab coordination is required in Phase 4. Reset links expire in 30 minutes and revoke all account sessions on successful use.

Resend is called only in `resend` mode, with a finite timeout. Mock mode sends nothing and is prohibited in production. Real sends require a verified sender and credentials configured securely. Reset links use the trusted frontend origin and a token fragment; frontend link consumption is implemented in Phase 4. No raw token is logged or returned by recovery endpoints.

Rate limiting currently uses bounded in-process state and untrusted forwarded IP headers are not accepted. Before running multiple backend instances, configure trusted proxy/client-IP handling and shared/edge enforcement as a deployment task.

### Real PostgreSQL auth tests

Use a dedicated test database with a name ending in `_test`, and pass its URL through `TEST_DATABASE_URL` in the process environment, then run:

```bash
pnpm test:auth:integration
```

There is no fallback to application `DATABASE_URL`. The suite applies committed migrations, exercises real transactions/HTTP with mocked email, and deletes only users created by that run (with cascading sessions/tokens). It does not truncate tables, drop schemas, reset volumes, or send email. Run it only against an intentionally supplied test database. Docker is not required if that PostgreSQL test instance is otherwise available.

Regular `pnpm test` / `pnpm test:e2e` use explicit test configuration; existing HTTP tests replace the database provider. These are separate from the live suite.

### Real PostgreSQL topics tests

With the same `TEST_DATABASE_URL` rules:

```bash
pnpm test:topics:integration
```

The suite exercises create/list/rename/delete, per-user name uniqueness, cross-account **404** on foreign ids, concurrent duplicate create, and Swagger path coverage. Users created during the run are deleted on teardown (cascade removes their topics).

### Real PostgreSQL problems tests

With the same `TEST_DATABASE_URL` rules:

```bash
pnpm test:problems:integration
```

The suite exercises problem CRUD, topic associations, URL duplicate **409**, cross-account isolation, `topicId` list filter, concurrent duplicate URL race, topic delete retest (problem remains), and Swagger coverage.

### Phase exit criteria (automated)

On a dedicated `TEST_DATABASE_URL` ending in `_test`:

```bash
pnpm verify:phase-5   # topics gates + optional problems topic-delete retest (VERIFY_PHASE6_TOPIC_DELETE=0 to skip)
pnpm verify:phase-6   # problems gates + frontend checks
```

See `docs/PHASE_5_RESULTS.md` and `docs/PHASE_6_RESULTS.md`.
