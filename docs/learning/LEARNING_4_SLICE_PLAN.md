# Phase 4 — Assessment slices

**Branch:** `feature/learning-guides`  
**Pre-execution plan:** segregates Phase 4 like Phase 3 (4A → 4D).

## Slice exit criteria

| Slice | Delivered | Signoff |
|-------|-----------|---------|
| **4.0** | Baseline gates, this doc, roadmap Phase 4 sub-bullets | (this file) |
| **4A** | `learning_assessments` / revisions / questions; AssessmentsModule; owner publish API | [LEARNING_4A_RESULTS.md](./LEARNING_4A_RESULTS.md) |
| **4B** | Attempts, answers, grading, learner workspace | [LEARNING_4B_RESULTS.md](./LEARNING_4B_RESULTS.md) |
| **4C** | Assessment block + `gated` completion integration | [LEARNING_4C_RESULTS.md](./LEARNING_4C_RESULTS.md) |
| **4D** | Multi-select, numerical, retakes, navigator UX, revision v2 | [LEARNING_4D_RESULTS.md](./LEARNING_4D_RESULTS.md) |

**Phase R1 closure:** [LEARNING_4_PHASE_SIGNOFF.md](./LEARNING_4_PHASE_SIGNOFF.md) (2026-11-27).

## Design authority

- [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md)
- [ASSESSMENT_ARCHITECTURE.md](./ASSESSMENT_ARCHITECTURE.md)
- [COMPLETION_ARCHITECTURE.md](./COMPLETION_ARCHITECTURE.md)
- [DOMAIN_ARCHITECTURE.md](./DOMAIN_ARCHITECTURE.md)
- Frontend: `solve-tracker-frontend/docs/learning/ASSESSMENT_REVIEW_DESIGN.md`

## Out of scope (all 4.x R1)

Question banks, flashcards, AI grading, code sandboxes, public publishing, ZIP assessment bundles.

## API route appendix (filled per slice)

| Method | Path | Slice |
|--------|------|-------|
| GET | `/learning/guides/:guideId/assessments` | 4A |
| POST | `/learning/guides/:guideId/assessments` | 4A |
| PATCH | `/learning/guides/:guideId/assessments/:assessmentId` | 4A |
| POST | `/learning/guides/:guideId/assessments/:assessmentId/questions` | 4A |
| POST | `/learning/guides/:guideId/assessments/:assessmentId/publish` | 4A (legacy) |
| GET | `/learning/guides/:guideId/assessments/:assessmentId/draft` | 4A.1 alias |
| POST | `/learning/guides/:guideId/assessments/:assessmentId/revisions` | 4A.1 preferred publish |
| POST | `/learning/guides/:guideId/assessments/:assessmentId/attempts` | 4B |
| PATCH | `/learning/guides/:guideId/assessments/:assessmentId/attempts/:attemptId/answers` | 4B |
| POST | `/learning/guides/:guideId/assessments/:assessmentId/attempts/:attemptId/submit` | 4B |
| POST | `/learning/guides/:guideId/assessments/:assessmentId/attempts/:attemptId/submissions` | 4B (alias) |
| GET | `/learning/guides/:guideId/assessments/:assessmentId/attempts/:attemptId` | 4B |