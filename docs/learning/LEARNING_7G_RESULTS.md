# Phase 7G — Data rights and policy

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`

## Delivered

| Area | Artifact |
|------|-----------|
| Account erasure | `DELETE /users/me` — password + `confirmation: DELETE`; revokes sessions; clears cookies; FK cascade removes learning rows |
| Guide export verification | `test-learning-data-rights-integration.mjs` — JSON/Markdown scope, import roundtrip |
| Guide soft-delete verification | Same script — 404 after delete, cross-user safe |
| Privacy copy | Landing privacy bullet, guide export hint, profile danger zone |
| Beta feedback | [LEARNING_BETA_FEEDBACK.md](./LEARNING_BETA_FEEDBACK.md), optional `VITE_BETA_FEEDBACK_URL` |
| Gates | [`verify-learning-7g.mjs`](../../scripts/verify-learning-7g.mjs) |

**Frontend:** profile danger zone (`ProfileDeleteAccountDialog`), learning welcome optional feedback link.

## Export scope (R1)

| Included | Excluded |
|----------|----------|
| Authored guide tree and block JSON/Markdown | Notes, attempts, progress, grading config |
| Portable `schemaVersion` | Media bytes (manifest may be empty) |
| Import preview/commit roundtrip | Full-account ZIP export |

## Deletion behavior

| Action | Effect |
|--------|--------|
| Guide `DELETE` | Soft-delete (`deleted_at`); HTTP 404; row retained for recovery window |
| Account `DELETE /users/me` | Hard-delete `users` row; cascades learning guides and related rows |
| Media at provider | Not purged automatically in 7G — see [SECURITY_RECOVERY_ARCHITECTURE.md](./SECURITY_RECOVERY_ARCHITECTURE.md) |
| Backups | Operator retention policy; no immediate backup erasure promise |

## Beta limitations

- Learning UI is build-time flagged (`VITE_LEARNING_GUIDES_ENABLED`). Rollout steps: [LEARNING_BETA_RUNBOOK.md](./LEARNING_BETA_RUNBOOK.md) (7H).
- No public guides or learning-content abuse reporting in 7G.
- Google-only accounts must set a password before self-serve erasure (`PASSWORD_REQUIRED`).

## Static / CI gates

```text
export TEST_DATABASE_URL=postgresql://…/practice_tracker_test
pnpm build
node scripts/verify-learning-7g.mjs
```

## Gates (2026-11-27)

| Gate | Result |
|------|--------|
| `node scripts/test-learning-data-rights-integration.mjs` | pass (**16** assertions) |
| `node scripts/verify-learning-7g.mjs` | pass (includes 7F chain) |
| Backend `pnpm test --run` (via 7G gate) | **334** passed (+3 erasure) |

## Handoff

**7H** — Beta packaging and launch checklist per [LEARNING_7_SLICE_PLAN.md](./LEARNING_7_SLICE_PLAN.md).