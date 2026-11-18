# PLATFORM-API A6 — Verification, ops, and documentation (results)

**Status:** complete (2026-11-18).  
**Plan:** [PLATFORM_CATALOG_API_PHASED_PLAN.md](PLATFORM_CATALOG_API_PHASED_PLAN.md) § A6.

## Verification

| Deliverable | Location |
| --- | --- |
| Contract gate | [`solve-tracker-frontend/scripts/verify-platform-api.mjs`](../../solve-tracker-frontend/scripts/verify-platform-api.mjs) |
| Scripts | `pnpm verify:platform-api`, `verify:catalog` (alias), `verify:platform-api:full` |
| PLATFORM-CLS | [`verify-platform-cls.mjs`](../scripts/verify-platform-cls.mjs) → `solve-tracker-frontend` + `verify:platform-api` |

**Checks (no server):** backend `PLATFORM_CATALOG` slugs ↔ `openapi.json` `GET /platforms` enum ↔ generated `backend.d.ts` ↔ `CATALOG_SLUGS`; list field shape matches `PlatformsService` mapping (`catalog-canonical`).

## Documentation

- [FRONTEND_CONVENTIONS.md](../../solve-tracker-frontend/FRONTEND_CONVENTIONS.md) § Platform catalog — backend-only edit flow
- [API_CLIENT.md](../../solve-tracker-frontend/API_CLIENT.md) — platforms module + contract
- [DEPLOY.md](../../solve-tracker-frontend/docs/DEPLOY.md) — verify + deploy/backfill ops
- [PLATFORM_CLASSIFICATION_PHASED_PLAN.md](PLATFORM_CLASSIFICATION_PHASED_PLAN.md) § Ops — aligned with PLATFORM-API §4
- [FRONTEND_HARDENING_PHASED_PLAN.md](../../solve-tracker-frontend/docs/FRONTEND_HARDENING_PHASED_PLAN.md) DATA-1 — API-backed verify narrative

## Commands

```bash
cd solve-tracker-frontend && pnpm verify:platform-api && pnpm check
# Pre-release:
pnpm verify:platform-api:full
# With test DB:
cd solve-tracker-backend && TEST_DATABASE_URL=…/_test pnpm verify:platform-cls
```

## Grep exit criteria

```bash
rg 'edit both' solve-tracker-frontend solve-tracker-backend/docs/PLATFORM_CLASSIFICATION_PHASED_PLAN.md solve-tracker-frontend/FRONTEND_CONVENTIONS.md
# expect no matches in active ops/conventions
```

## Next

**A7** (optional) — `POST /platforms/classify` for server-side URL preview.