# Learning 5.0 — baseline (locked decisions)

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`  
**Prerequisite:** [LEARNING_4_PHASE_SIGNOFF.md](./LEARNING_4_PHASE_SIGNOFF.md)  
**Contract:** [LEARNING_5_PROBLEM_LINK_CONTRACT.md](./LEARNING_5_PROBLEM_LINK_CONTRACT.md)

5.0 ships **documentation and gate evidence only**. No migrations, no Nest exports, no new HTTP routes until **5A**.

---

## Migration blueprint (implement in 5A)

Mirror [4C assessment links](../../../drizzle/20261127140709_learning_assessment_links_4c/migration.sql):

```sql
ALTER TYPE "learning_block_type" ADD VALUE 'problem';
```

Table `learning_problem_links` per [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md):

| Column | Notes |
|--------|--------|
| `block_id` | PK, FK `(guide_id, block_id)` → `learning_blocks` ON DELETE CASCADE |
| `guide_id` | FK → `learning_guides` ON DELETE CASCADE |
| `normalized_url` | text, not null; canonical identity for resolution |
| `display_url` | text, not null; author-facing / UI |

**No FK to `problems`.** Resolution is `(learner_id, normalized_url)` at read time via ProblemsModule.

After migration:

- `pnpm verify:pg-enums`
- Update [`learning-block-type.enum.ts`](../../src/database/schema/learning/learning-block-type.enum.ts) and frontend [`block-types.ts`](../../../solve-tracker-frontend/src/lib/learning/block-types.ts) in 5A.

---

## Author payload (portable)

Block type `problem`; Zod shape (5A):

- `url` — author input; normalized with [`problem-url.ts`](../../src/modules/problems/problem-url.ts)
- `label` — optional string (display)

Persist link row on `replaceNodeContent`; block `payload` stores normalized fields for export. **Never** store `problem.id` in guide JSON.

**Validation errors (5A):** reuse problems semantics where possible — reserve `PROBLEM_URL_INVALID`, `PROBLEM_PLATFORM_UNSUPPORTED`.

---

## Learner resolution (API field)

Per problem block on content/tree (5B):

| `problemResolution` | Meaning |
|---------------------|---------|
| `unresolved` | No owned `problems` row for `normalized_url` |
| `linked_unsolved` | Row exists, `status !== solved` |
| `solved` | Row exists, `status === solved` (manual; not judge-verified) |

Batch lookup by enrollment learner id + distinct URLs on the guide (see contract doc).

---

## Gated completion (5D)

**R1 product rule (aligned with 4C assessments):** On `completion_mode = gated`, **every** `learning_problem_links` row on that node participates in the AND gate together with assessment links. There is no per-block `required` flag in schema today; optional-only blocks are a later milestone ([COMPLETION_ARCHITECTURE.md](./COMPLETION_ARCHITECTURE.md)).

Unsolved or unresolved problem links block gated completion. Deleting the learner’s problem row returns `unresolved`; the guide and link row remain.

---

## URL / content edits

`replaceNodeContent` deletes and recreates blocks and link rows. Changing a problem URL on a block creates a new link identity; prior solved state does not apply to the new URL (architecture: “problem URL changes resolve new evidence”).

---

## Reserved HTTP surface (locked in 5.0)

See [LEARNING_5_SLICE_PLAN.md](./LEARNING_5_SLICE_PLAN.md) API appendix — enriched existing reads for 5B/5D; `GET /problems/:problemId/learning-references` for 5E; add-to-library via existing `POST /problems` only.