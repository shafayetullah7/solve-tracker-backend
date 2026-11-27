# Learning 5E — backlink conventions

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`

Cross-link: [LEARNING_5_PROBLEM_LINK_CONTRACT.md](./LEARNING_5_PROBLEM_LINK_CONTRACT.md).

## Scope

- **Private owner only** — callers see steps in guides they **own**, not enrollments or other users’ guides.
- Foreign `problemId` → **404** (same as problem GET); never return another user’s guide titles.

## Matching

Backlinks key off **normalized URL**, not problem primary keys. Two library rows with the same URL each resolve links against their owner’s guides independently.

## Lifecycle

- Soft-deleted guide or node → omitted from backlinks.
- Archived (non-deleted) guides → included in R1.
- Removing problem row does not remove guide links; backlinks disappear only when the owned problem is deleted (endpoint 404).