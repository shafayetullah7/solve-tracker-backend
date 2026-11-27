# Phase 1 consolidated review and delivery scope

Status: Phase 0 and Phase 1 closed 2026-11-27 ([PHASE_0_1_CLOSURE.md](./PHASE_0_1_CLOSURE.md)). This is the proposed reconciliation of practice-learning-roadmap.md, LEARNING_REQUIREMENTS.md and LEARNING_CAPABILITY_EXPANSION.md. Existing six approved decisions remain binding. No implementation or test execution.

## Release scope
R1 foundation: all LG-01–10 MUST and NFR-01–10, including private guides, recursive nodes, visual editor, Markdown/JSON import/export, notes, assessments, practical checklists, problem links, progress, dark mode, onboarding and existing feature compatibility. R2 complete personal learning: flashcards/spaced repetition, reusable banks, richer questions, knowledge search/links/highlights, projects/evidence/rubrics, planner/goals/sessions and evidence-based analytics. R3 optional AI, isolated execution/simulations, public publishing/forking with privacy/moderation. R2 is a planned product milestone, not an indefinite backlog; R3 remains conditional. No institutional LMS or mandatory paid AI. Release 1 does not depend on R2 infrastructure beyond stable extension boundaries.

## Traceability
Frontend feature branch docs/learning: SHELL_DASHBOARD_DESIGN.md (shell/overview/theme); LEARNING_WORKSPACE_DESIGN.md (library/tree/study); BLOCK_EDITOR_DESIGN.md (authoring); ASSESSMENT_REVIEW_DESIGN.md (assessment/banks/review); PORTABILITY_KNOWLEDGE_PROJECTS_DESIGN.md (import/export/search/evidence); PLANNING_ANALYTICS_DESIGN.md (goals/planner/analytics); PRODUCT_INTEGRATION_DESIGN.md (navigation/onboarding/settings). Backend LEARNING_A1_UX_SPEC.md supplies initial journeys. These specify 14 design milestones, not implemented screens.

## Architecture gates
Phase 2 must define domain boundaries, ERD, constraints/indexes, transactional hierarchy and ordering, content registry and revision compatibility, completion semantics, assessment grading, private media migration, import/export, authorization threat model, concurrency/idempotency, API contracts, migration/recovery and measurable operational budgets. Plan R2 extension interfaces without speculative tables/services. Use existing NestJS/Express, Drizzle/PostgreSQL, Zod, Solid 2 and generated OpenAPI contracts; verify installed versions. Preserve current coding APIs and routes. Resolve conflicts between proposed documents explicitly, including optional subtree semantics, archive mutation policy, short-answer grading, media portability, timers and scheduling.

## Delivery
Phase 3 first vertical slice guide/node CRUD, tree invariants, frontend library/study, then blocks/notes/import. Phase 4 assessments. Phase 5 coding integration. Phase 6 product integration and dark mode. Phase 7 hardening and beta. After R1, implement R2 in vertical slices (banks/review, knowledge, projects, planner/analytics) with same security and test gates. R3 only after separate feasibility/security review. Each slice backend tests, OpenAPI generation, frontend implementation/tests, migration and regression checks. Feature branches only; no main changes.

## Exit gates (closed)
Phase 0 and Phase 1 closed per [PHASE_0_1_CLOSURE.md](./PHASE_0_1_CLOSURE.md) with documented waivers (screenshots, full a11y, hi-fi mockups). Phase 2 design and Phase 3+ implementation may proceed on `feature/learning-guides`; address register A01–A15 in planned phases.
