# Practice — Learning Guides Integration Roadmap

**Status:** Proposed implementation plan  
**Scope:** Existing Solve Tracker frontend and backend; public-release-oriented evolution.  
**Goal:** Make structured self-learning and coding practice feel like one coherent product.

## 1. Product direction

Retain the Practice brand and existing problem-tracking functionality. Organize the product around Learn (knowledge and assessments), Practice (coding problems and assignments), and Track (progress and mastery). Target independent learners across subjects, not institutional classrooms. Both learning and coding practice must remain independently useful.

### Existing project references

- [Backend](https://github.com/shafayetullah7/solve-tracker-backend)
- [Frontend](https://github.com/shafayetullah7/solve-tracker-frontend)
- [Backend conventions](https://github.com/shafayetullah7/solve-tracker-backend/blob/main/BACKEND_CONVENTIONS.md)
- [Drizzle conventions](https://github.com/shafayetullah7/solve-tracker-backend/blob/main/DRIZZLE_CONVENTIONS.md)
- [Frontend conventions](https://github.com/shafayetullah7/solve-tracker-frontend/blob/main/FRONTEND_CONVENTIONS.md)
- [Theme](https://github.com/shafayetullah7/solve-tracker-frontend/blob/main/src/styles/theme.css)
- [Application shell](https://github.com/shafayetullah7/solve-tracker-frontend/blob/main/src/components/app/AppShell.tsx)

Keep NestJS, PostgreSQL, Drizzle, Zod, SolidJS, existing authentication, media infrastructure, API client and OpenAPI generation. Follow pinned dependency versions and repository conventions. Do not introduce separate services, databases or infrastructure without a demonstrated need.

## Phase 0 — Baseline and product decisions

**Objective:** Establish a reliable baseline before changing either repository.

- [x] Run both applications locally; inspect desktop and mobile screens, authentication, onboarding, library, topics, dashboard, profile and Discover.
- [x] Run existing lint, typecheck, unit, integration and end-to-end tests using repository scripts; record failures separately from new work.
- [x] Inspect current schema, ownership checks, media lifecycle, visibility settings and deployment/migration process.
- [x] Capture screenshots and identify reusable components and accessibility issues (**waived** — [PHASE_0_1_CLOSURE.md](./PHASE_0_1_CLOSURE.md)).
- [x] Confirm terminology: guide, step/node, content block, assessment, attempt, completion and mastery.
- [x] Confirm initial release scope: private guides, manual creation, import/export, nested steps, content, tests, progress and problem links.
- [x] Decide whether publishing guides is required at launch; default to later, while preserving architectural support.
- [x] Record decisions in requirements and architecture documents in both repositories.

**Exit criteria:** Baseline documented; product scope agreed; existing regressions identified; no speculative schema migrations. **Closed 2026-11-27.**

## Phase 1 — Information architecture and UX

**Objective:** Design the complete experience before committing to implementation details.

- [x] Map journeys for coding-only users, learning-only users, mixed users, first-time users and returning users ([LEARNING_A1_UX_SPEC.md](./LEARNING_A1_UX_SPEC.md)).
- [x] Propose navigation: Overview; Learn / Learning guides; Practice / Problems and Topics; Discover; Profile. Add Review only when implemented.
- [x] Preserve existing URLs where practical; plan redirects and deep-link behavior for any changes.
- [x] Replace global Add problem with a Create menu while retaining a prominent add-problem action in the problem library (**design only; implementation Phase 6**).
- [x] Design a dashboard prioritizing resume learning and practice queue; keep detailed coding statistics in a dedicated practice view. Avoid empty irrelevant panels.
- [x] Design guide library, guide overview, focused study workspace, guide editor, assessment-taking and results screens (`solve-tracker-frontend/docs/learning/*`).
- [x] Design creation flows: blank guide, paste/import Markdown outline, structured JSON import; AI generation later.
- [x] Specify loading, empty, error, permission-denied, offline/interrupted-save and destructive-action states.
- [x] Produce responsive wireframes and high-fidelity designs (**markdown specs approved; Figma waived** — [PHASE_0_1_CLOSURE.md](./PHASE_0_1_CLOSURE.md)).

**Design direction:** Retain existing teal palette (#11665a), semantic tokens, typography foundation, buttons and form controls. Extend reading typography, tree navigation, block editor, assessment controls and progress indicators. Use a compact global rail in study mode, collapsible guide tree, readable central content, optional notes drawer. On mobile use one main pane and a tree drawer. Avoid three permanently open sidebars.

**Exit criteria:** Approved screen designs and user journeys; keyboard/mobile interaction specifications; no unresolved critical navigation questions. **Closed 2026-11-27** (spec approval; hi-fi waived).

## Phase 2 — Technical architecture and contracts

**Objective:** Define durable domain boundaries and data invariants.

### Proposed data model

| Entity | Responsibility |
|---|---|
| learning_guides | Owner, title, description, lifecycle and visibility |
| learning_nodes | Guide ID, parent ID, stable ID, order, metadata and completion policy |
| learning_blocks | Node ID, type, order, validated JSONB payload, schema version, required flag |
| learning_enrollments | User-to-guide relationship and learner state |
| learning_node_progress | Enrollment/node completion, mastery and timestamps |
| learning_block_progress | Completion of trackable blocks |
| learning_assessments / revisions | Assessment identity, immutable published configuration and passing rules |
| learning_questions | Revision-scoped typed prompts, scoring and private grading configuration |
| learning_attempts / answers | Learner attempts, submitted answers, scores and revision references |
| learning_notes | Private learner notes scoped to a node |
| learning_problem_links | Node/block association with portable problem identity or URL |
| learning_media_links | Attachment references integrated with existing media lifecycle |

Names are provisional. Finalize cardinality, deletion behavior, uniqueness, indexes and ownership constraints before migration. Do not reuse the existing topics table as learning nodes: topics categorize problems, while nodes represent curriculum structure.

### Core invariants

- Use an adjacency list and recursive CTEs for arbitrary-depth hierarchy; enforce same-guide parent relationships and prevent cycles, including concurrent moves. Use practical depth and payload limits for abuse protection.
- Keep ordering stable and moves transactional; define subtree deletion and restoration behavior.
- Use relational foreign keys for identity and relationships, JSONB for polymorphic content/configuration. Validate each block with Zod discriminated unions and schema versions; use trusted renderers, never arbitrary executable HTML or JavaScript.
- Separate content ownership from learner progress; enforce access at every resource boundary. Private by default.
- Distinguish own-node completion from descendant progress; define denominator, optional steps, empty guides, edits after completion and completion invalidation. Mastery is separate from completion.
- Preserve historical assessment attempts against immutable revisions; never send grading secrets in learner-facing question responses.
- Define portable, versioned import/export format; validate limits, references and content before transactional import.
- Use explicit response schemas and regenerate frontend OpenAPI types. Verify discriminated unions survive generation.

### Module layout

Add `src/modules/learning/` with domain services, controllers, repositories and schemas; put tables under `src/database/schema/learning/`, register schema exports and Drizzle relations, and compose in AppModule. Reuse authentication guards and DatabaseService. Keep cross-module interfaces narrow; do not place learning business rules in existing problem progress services.

Proposed routes: `/learning/guides`, `/learning/guides/:guideId/nodes`, node/block resources, assessment/attempt resources, and enrollment/progress resources. Specify pagination, authorization, error contracts and concurrency semantics before implementation.

**Exit criteria:** Reviewed ERD, API contract, migration/rollback plan, threat model, progress rules and representative fixtures.

## Phase 3 — Learning foundation (vertical slice)

**Objective:** A user can create a guide, study a step and resume later.

- [x] Implement additive migrations, ownership constraints, guide CRUD, enrollment and recursive node CRUD/move/reorder (3A; blocks/progress tables in 3B).
- [x] Add frontend API modules and generated types following existing client conventions.
- [x] Implement `/app/learning`, guide overview, node deep links and study workspace.
- [x] Add editor with inline node creation, keyboard indentation, drag/drop plus accessible alternatives, autosave with conflict handling, undo and delete confirmation. _(3B.5: structure route + keyboard reorder; DnD not adopted; undo still open.)_
- [x] Implement initial blocks: text, code snippets and checklists (3B R1). _Rich text, links/resources, images and video embeds remain open (3C)._
- [x] Manual completion, derived progress (required steps) and resume position. _Private notes deferred._
- [x] Implement Markdown outline import and versioned JSON import/export with preview and validation. _(3C: JSON + Markdown; ZIP bundle + image bytes deferred.)_
- [x] Test cross-account isolation, hierarchy cycles, concurrent edits, ordering and progress calculations (integration script). _Import failure cases N/A until import exists._

**Exit criteria:** A realistic embedded engineering guide can be imported, edited, studied and resumed on desktop/mobile. Existing problem tracker remains functional.

## Phase 4 — Assessment engine

**Objective:** Test knowledge at any step or parent section. **Execution slices:** [LEARNING_4_SLICE_PLAN.md](./LEARNING_4_SLICE_PLAN.md).

- [x] **4A** — Assessment CRUD, draft revision, questions (single choice / true-false), publish immutable revision v1; AssessmentsModule; owner API only.
- [x] **4B** — Attempts/answers, objective grading, learner workspace (start/save/submit/results); no grading keys in learner DTO.
- [x] **4C** — Assessment block type + `learning_assessment_links`; **gated** node completion from best valid score vs threshold.
- [x] **4D** — Multiple choice (multi), numerical tolerance, retakes/best score, question navigator, republish v2; in-flight attempts stay on bound revision. _(Portable assessment JSON deferred — see signoff.)_
- [ ] Defer question banks, flashcards, short-answer self-review at scale, timers/sweeper polish, executable sandboxes, AI grading (R2/R3).

**Exit criteria:** A learner on a gated step can pass a required assessment; scores reproducible; attempts preserved; full 4A–4D signoff docs and gates green.

**R1 signoff (2026-11-27):** [LEARNING_4_PHASE_SIGNOFF.md](./LEARNING_4_PHASE_SIGNOFF.md)

## Phase 5 — Existing problem tracker integration

**Objective:** Connect knowledge acquisition with deliberate coding practice.

- [ ] Add a problem-assignment block that searches existing library or accepts a supported problem URL.
- [ ] Reuse existing URL normalization/platform behavior; preserve portable assignment identity for future shared guides.
- [ ] Resolve assignments to the current learner's own problem record, with an explicit add-to-library flow when missing.
- [ ] Derive linked completion from existing solved status; define behavior when a problem is unsolved again or deleted.
- [ ] Add backlinks from problem detail to related learning steps where useful.
- [ ] Support practical assignment checklists and evidence attachments separately from coding problems.
- [ ] Keep manually marked solved status clearly labeled; do not claim automatic judge verification.
- [ ] Test synchronization, duplicate links, deleted records and cross-account access.

**Exit criteria:** A DSA guide can require reading, passing a test and solving linked problems without duplicating progress entry.

## Phase 6 — Product-wide integration and polish

**Objective:** Make the new feature feel native to Practice.

- [ ] Implement approved navigation and responsive shell; preserve existing accessibility and route behavior.
- [ ] Redesign Overview with resume learning, practice queue and relevant activity; retain detailed practice analytics.
- [ ] Keep learning and problem metrics distinct; define combined activity/streak semantics explicitly and avoid double counting.
- [ ] Update landing page, SEO metadata, social preview, onboarding, empty states and help copy to reflect Learn / Practice / Track.
- [ ] Add guide search, filters, archive and resume shortcuts; ensure keyboard navigation and focus restoration.
- [ ] Test real long-form content, code overflow, narrow screens, large trees and reduced motion. Add dark mode only if fully tested and prioritized.
- [ ] Update both repositories' requirements, API documentation and deployment instructions.

**Exit criteria:** Existing users can continue their workflow unchanged in substance; new learning-only users can onboard without creating coding problems.

## Phase 7 — Public release hardening

**Objective:** Safely release the integrated product to real users.

- [ ] Review authorization, session security, content sanitization, URL/embed restrictions, upload quotas, rate limits and import abuse limits.
- [ ] Verify private notes, attempts, progress and media cannot leak through public profile or Discover APIs.
- [ ] Benchmark large guide trees, progress aggregation and assessment history; inspect query plans and add evidence-based indexes.
- [ ] Test migrations against representative existing data; verify backup/restore and rollback or forward-fix procedure.
- [ ] Run unit, integration, end-to-end, accessibility and responsive regression tests; test supported browsers and mobile devices.
- [ ] Add operational metrics, error reporting without sensitive content, resource limits and deployment health checks.
- [ ] Prepare account/data deletion, export, privacy information, feedback channel and abuse reporting appropriate to released features.
- [ ] Roll out behind a feature flag to a small beta group; collect usability feedback, fix blockers, then expand access.

**Exit criteria:** No known critical security/data-loss/accessibility blockers; baseline regression suite passes; recovery procedure tested; beta feedback reviewed.

## Phase 8 — Post-release extensions

Prioritize based on observed usage, not speculative complexity.

- AI-assisted roadmap generation and node expansion using validated structured output, user preview, quotas and cost controls.
- Flashcards, spaced repetition, review queue, richer question types and mastery tracking.
- Public guide publishing, discovery, copying/forking and version updates without losing personal progress; separate publication visibility from practice visibility.
- Public content moderation, reporting, licensing/attribution and revision history before enabling community publishing.
- Trusted interactive simulations and isolated code execution only after security review.
- Collaboration and advanced analytics only when demand justifies them.

## Delivery and coordination

Implement in small vertical slices across both repositories. For each slice: update requirements/acceptance criteria, implement additive backend changes and tests, regenerate OpenAPI types, implement frontend states and interactions, run regression tests, review accessibility and document deviations. Deploy compatible backend changes before dependent frontend changes. Avoid destructive migrations and unrelated refactors. Keep a feature flag until the complete experience is ready.

### Decisions requiring confirmation

- Whether public guide publishing belongs in the first release or a later release.
- Whether guide progress is weighted by steps, estimated effort or explicit weights; initial preference is transparent required-step counts.
- Whether assessment retakes use best or latest score for completion; preserve all attempts regardless.
- Whether Markdown or a richer block editor is the primary authoring experience; support portable import/export either way.
- Whether dark mode is a launch requirement.

### Review limitations

This plan is based on the prior source-level repository review, including conventions, navigation, theme, landing copy and selected backend schemas. The application has not been run or visually audited in a browser, and tests have not been executed. Screen concepts, table names, routes and phase boundaries are proposals, not verified implementation details. Independent learners, private-first guides, delayed community publishing and retention of the Practice brand are working assumptions. No repository files have been modified by preparing this plan.