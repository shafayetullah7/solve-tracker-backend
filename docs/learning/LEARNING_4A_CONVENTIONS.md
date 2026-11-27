# Learning 4A.1 — conventions hardening

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`

## Implemented vs [API_ARCHITECTURE.md](./API_ARCHITECTURE.md)

| Target | R1 implementation |
|--------|-------------------|
| `GET/PATCH A/draft` | `GET .../assessments/:id/draft` (alias of author GET) |
| `POST A/revisions` | `POST .../assessments/:id/revisions` (+ legacy `.../publish`) |
| Operation idempotency | `learning_operations` via `AssessmentMutationsRepository` |
| `active_revision` FK | Migration `learning_assessments_active_revision_fk` (SQL; Drizzle schema avoids revision↔assessment cycle) |

Authoring and attempt routes split: `AssessmentsController` vs `AttemptsController`.