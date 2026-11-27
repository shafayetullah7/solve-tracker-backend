# Learning 4D.1 — conventions hardening

**Date:** 2026-11-27  
**Branch:** `feature/learning-guides`

## Question types (R1)

| Kind | Grading | Learner response |
|------|---------|------------------|
| `single_choice` | Exact option id | `{ selectedOptionId }` |
| `true_false` | Exact boolean | `{ value }` |
| `multiple_choice` | Exact set match, no partial credit | `{ selectedOptionIds }` |
| `numerical` | Inclusive tolerance on scaled integers | `{ valueScaled }` |

### Multiple choice duplicates

If `selectedOptionIds` contains the same id more than once, the answer scores **0** (treated as invalid selection). See [`grade-objective.ts`](../src/modules/assessments/grading/grade-objective.ts).

### Numerical (R1 vs architecture)

[ASSESSMENT_ARCHITECTURE.md](./ASSESSMENT_ARCHITECTURE.md) describes decimal strings long-term. R1 uses **fixed-scale integers**: `correctValueScaled`, `toleranceScaled`, and learner `valueScaled` (SPA multiplies decimal input ×100). Future slices may add string decimals without breaking stored attempts.

### Unanswered

`null` on save clears objective credit for that question on submit (0 points). Clearing a numerical field in the workspace sends `null`, not `{}`.

## Retakes

- After **finalize**, `POST .../attempts` creates a **new** in-progress attempt (**201**); there is no abandon endpoint in R1.
- Prior finalized attempts are retained. **Gated** completion uses the **best** finalized `scoreBasisPoints` per assessment ([LEARNING_4C_CONVENTIONS.md](./LEARNING_4C_CONVENTIONS.md)).
- Attempt DTO `passed` remains revision-scoped ([LEARNING_4B_CONVENTIONS.md](./LEARNING_4B_CONVENTIONS.md)).

## Republish (v2+)

New starts bind the **active** revision at start time. In-flight attempts keep their bound `revisionId` through submit.

Compatibility identity and “reassessment required” labels are **not** implemented in R1; gates compare raw best score to active threshold only.