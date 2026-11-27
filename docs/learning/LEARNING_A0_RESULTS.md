# Learning — Phase 0 decisions

Date: 2026-11-27
Status: Product decisions approved; baseline verification pending.

## Approved decisions

| ID | Decision | Approved direction |
|---|---|---|
| A0-01 | Audience | All independent learners |
| A0-02 | Publishing | Private first; public publishing later |
| A0-03 | Authoring | Visual block editor and Markdown import |
| A0-04 | Progress | Required step completion |
| A0-05 | Retakes | Best valid score counts |
| A0-06 | Appearance | Dark mode included in public release |

## Implementation implications

- Use subject-neutral terminology and content types. Coding problems are optional learning activities, not a prerequisite for using guides.
- Preserve existing problem tracking, topics, accounts and privacy behavior. Learning and practice must work independently.
- Keep guide content separate from personal progress, notes and attempts. Default guides to private; do not expose guide publishing or discovery until authorization and publication rules are designed.
- Support recursive steps with content at every level. Use an extensible typed block model; validate imported Markdown, preview the hierarchy, and preserve unsupported content or report it explicitly. Provide keyboard-accessible editing, autosave feedback and recovery.
- Proposed progress semantics: completed required steps divided by total required steps, with each eligible step counted once. Optional steps do not affect the denominator. Parent rollups are not counted as extra completed steps unless the parent has its own required work. Empty guides show no progress. Exact eligibility and behavior after edits require Phase 2 specification.
- Retain all submitted attempts. Use the highest valid normalized score for completion, not the most recent score. Never expose grading keys to learners before submission. Define validity, revision compatibility, pass thresholds and invalidation in Phase 2; do not silently compare incompatible assessment revisions.
- Extend existing semantic design tokens to light and dark themes, support system preference and explicit user selection, and verify contrast, focus, code highlighting, diagrams, editor and assessment states in both themes before public release.

## Product boundaries

The product is a self-directed learning and deliberate-practice workspace, not an institutional LMS. Retain the existing Practice identity as a working design direction. AI generation, collaboration, public guide discovery, simulations and spaced repetition are deferred unless explicitly reprioritized.

## Existing system constraints

- Keep NestJS, SolidJS, PostgreSQL, pinned Drizzle, Zod and OpenAPI contracts; follow repository conventions.
- Existing problems are user-owned and URL uniqueness is scoped to the owner. Future shared guides need portable problem references, not private problem IDs.
- Existing media reference counting assumes gallery and avatar slots only; revise its lifecycle contract before attaching learning images.
- Existing authentication and authorization conventions apply to every learning resource.

## Remaining Phase 0 exit gates

- [x] Initial source review and product direction.
- [x] Six product decisions approved.
- [ ] Runtime baseline: builds, tests, migrations and API contract checks.
- [ ] Desktop/mobile visual and accessibility audit.
- [ ] Authorization and media lifecycle baseline review.
- [ ] Finalize requirements and record baseline results.
- [ ] Review Phase 0 exit criteria before Phase 1.

No repository changes or runtime verification are claimed by this document.

## Source references

- https://github.com/shafayetullah7/solve-tracker-backend/blob/main/REQUIREMENTS.md
- https://github.com/shafayetullah7/solve-tracker-backend/blob/main/BACKEND_CONVENTIONS.md
- https://github.com/shafayetullah7/solve-tracker-backend/blob/main/MEDIA_CONVENTIONS.md
- https://github.com/shafayetullah7/solve-tracker-backend/blob/main/src/database/schema/problems/problems.table.ts
- https://github.com/shafayetullah7/solve-tracker-frontend/blob/main/FRONTEND_CONVENTIONS.md
- https://github.com/shafayetullah7/solve-tracker-frontend/blob/main/src/styles/theme.css