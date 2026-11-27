# Practice — Learning requirements

Date: 2026-11-27  
Status: Phase 0 requirements draft for review; six product decisions approved.  
Companion documents: `LEARNING_A0_RESULTS.md`, `practice-learning-roadmap.md`.

## 1. Purpose and scope

Practice is a personal workspace for independent learners to organize knowledge, practice skills, assess understanding and track progress. Learning is subject-neutral; coding practice remains a first-class, independently usable capability. The first public release of the application supports private guides, not public guide publishing. Existing accounts, problems, topics, solved status and sharing behavior must remain intact.

Normative language: MUST denotes a release requirement; SHOULD denotes a recommended behavior. Detailed implementation choices remain for Phase 2. Rules below beyond the six approved decisions are proposed defaults pending review.

## 2. Approved decisions

| ID | Decision |
|---|---|
| A0-01 | All independent learners |
| A0-02 | Private guides first; public publishing later |
| A0-03 | Visual block editor and Markdown import |
| A0-04 | Progress based on required step completion |
| A0-05 | Best valid assessment score counts |
| A0-06 | Dark mode included in public release |

## 3. Domain vocabulary

Guide: a learning plan. Step: a recursive unit of learning with its own content and children. Block: ordered typed content or activity. Assessment: a scored test. Attempt: one submission against an assessment revision. Resource: supplementary material. Note: private learner-authored annotation. Progress: completion of required work. Mastery: separate evidence or self-report of understanding, not a synonym for completion.

## 4. Functional requirements

### LG-01 — Guide library and lifecycle
- MUST create, rename, describe, duplicate, archive, restore and delete private guides; show progress and last activity; search and filter by status.
- MUST provide an empty state with create/import actions. Archived guides remain readable and exportable but are excluded from active recommendations.
- MUST confirm destructive actions and describe their effects on content, notes and attempts. Prefer recoverable deletion; retention period to be specified.
- Acceptance: a learner can create a guide without adding a problem or topic; duplicate creates independent content and does not copy personal progress; another account cannot retrieve it by ID.

### LG-02 — Recursive structure
- MUST support steps at any conceptual depth, each with content and children; no fixed chapter/lesson levels. Enforce documented operational depth and size limits rather than unbounded requests.
- MUST add siblings/children, rename, reorder, move, duplicate and remove subtrees; preserve stable identity on moves. Provide keyboard alternatives to drag-and-drop.
- MUST reject cycles, cross-guide parent references and unauthorized mutations. Multi-row moves and reorders are atomic; concurrent edits must not silently overwrite structure.
- Acceptance: a parent containing its own article and three children can be moved without losing content or progress; moving it under its descendant fails without partial changes.

### LG-03 — Content and visual authoring
- MUST support ordered rich text (headings, lists, tables, links), code with language and highlighting, images with alt text, external resources, video links, checklists, practical activities and assessment references. Support math and diagrams in a safe declarative format.
- MUST allow content on any step, not just leaves. Provide insert, edit, reorder, duplicate and remove operations; preview learning mode; clear saving/saved/error states, undo and recovery from interrupted saves.
- MUST validate each block type and schema version on the server. Unknown types are rejected for writes or safely preserved with explicit unsupported-content display on import; never execute arbitrary imported HTML, scripts or code.
- Acceptance: a learner builds a step containing prose, a Rust snippet, a circuit image and a checklist; reload preserves order and formatting; failed saves are visible and retryable.

### LG-04 — Import and export
- MUST import Markdown outlines and versioned structured JSON. Preview hierarchy, content, warnings and unsupported syntax before committing; permit correction or cancellation. No AI dependency.
- MUST export portable Markdown and lossless supported guide JSON; document what is excluded (private notes, attempts and progress by default), media references and schema versions. Export personal records separately as part of data portability.
- MUST validate size, depth, references, URLs and schema; import is atomic or explicitly staged without exposing partial guides. Repeated import must not silently merge or overwrite existing content.
- Acceptance: importing a nested outline produces the previewed hierarchy; invalid JSON does not create a partial guide; export/import round-trip preserves supported content and ordering.

### LG-05 — Learning workspace
- MUST provide guide overview, searchable/collapsible step tree, focused reading view, breadcrumbs, previous/next navigation, resume position, completion controls and access to notes/resources.
- MUST separate study and edit modes. Deep links to authorized steps work after refresh. On mobile the tree is a drawer or equivalent accessible navigation; content remains readable without horizontal scrolling except intrinsically wide code/tables.
- Acceptance: a learner resumes the last visited step on another session, navigates via keyboard, and studies without entering editor mode.

### LG-06 — Completion and progress
- MUST calculate progress from required eligible steps, not time, number of blocks or assessment average. Show completed/required counts and percentage; optional steps excluded.
- Proposed default: a step with its own required work counts once; structural-only parents are rollups, not additional denominator entries. Parent own completion and subtree completion are distinct. Empty guides display no progress rather than 100%.
- MUST support manual completion for steps without gated requirements; required activities and assessments must satisfy their configured rules. Repeated completion requests are idempotent. Reopening or changing required work recomputes affected progress; explain decreases after edits.
- MUST preserve historical activity separately from current completion. Do not treat mastery as completion or infer mastery solely from reading.
- Acceptance: 3 completed of 5 eligible required steps yields 60%; adding an optional step does not change it; adding a new required incomplete step yields 50%; no double counting of parent rollups.

### LG-07 — Assessments and grading
- MUST attach assessments to any step; support multiple assessments per step, configurable pass thresholds, required/optional status and retakes.
- Initial question types: single choice, multiple choice, true/false, numerical with tolerance and short answer with explicit self/manual review where objective grading is unavailable. Practical activities may use checklists or self-attestation; label evidence honestly.
- MUST persist attempts, answers, scoring and assessment/question revisions. Server grades objective questions; grading keys are excluded from pre-submission learner responses. Owner-authors can inspect their own answer keys in edit mode; this is not a secure proctored exam product.
- MUST use best valid normalized score for completion. Proposed default: validity is scoped to the active compatible revision; incompatible edits preserve history but require reassessment. Define partial credit, rounding, numerical units and revision compatibility in Phase 2.
- MUST make final submission idempotent, prevent unauthorized attempt access, distinguish in-progress/submitted/pending-review states, and show feedback and attempt history.
- Acceptance: valid scores 80%, 60%, 90% produce best 90%; at a 75% threshold the second attempt does not revoke passing status; an invalidated attempt is excluded; duplicate submission does not create a second result.

### LG-08 — Notes, resources and mastery
- MUST allow private notes per step, editable independently of authored content; external resource title, URL and optional description; safe link opening.
- SHOULD provide a basic self-reported mastery scale with clear labels (unfamiliar, familiar, understood, applied, mastered); no effect on completion by default.
- Acceptance: editing or duplicating a guide does not leak notes; a learner can complete a step while reporting low mastery.

### LG-09 — Coding practice integration
- MUST allow linking an existing problem or adding a portable problem reference from a step; resolve to the current user's library using existing normalized URL rules. Avoid duplicate personal problem records.
- MUST reflect manually recorded solved status in linked required activities; no claim of judge verification. Reverting solved status updates dependent completion. Deleting a problem must not delete the guide or step; preserve the reference and offer relinking.
- MUST preserve existing topic and library behavior. Future publishing must use portable identities, never expose private problem IDs or notes.
- Acceptance: one problem linked to two steps remains one library record; solving it updates both relevant activities; deleting it leaves both steps intact.

### LG-10 — Product integration and appearance
- MUST update navigation, landing copy, onboarding and overview to communicate learning and practice without forcing either workflow. Preserve existing routes or provide compatible redirects.
- MUST show resume learning, active guides and practice queue where relevant; keep learning completion and problem solved counts separately labeled. Existing users with no guides see useful practice-first content; new learners with no problems see useful learning-first content.
- MUST support light, dark and system appearance preferences, persisted across reloads; use semantic tokens and consistent focus, contrast, editor and code styling.
- Acceptance: existing practice-only user can reach their library and mark solved without creating a guide; learning-only user can complete a guide without adding a coding problem; both themes work on desktop/mobile.

## 5. Cross-cutting requirements

| ID | Requirement | Acceptance evidence |
|---|---|---|
| NFR-01 | Authorization: every guide, step, block, note, attempt and media operation enforces ownership and parent scope server-side. | Two-account negative tests including nested IDs, imports and exports. |
| NFR-02 | Privacy: private by default; no learning data in existing Discover/profile APIs. | Public/unauthenticated requests cannot access private learning records or attachments. |
| NFR-03 | Security: sanitize rich content, restrict URL schemes, validate payloads, protect cookie-authenticated mutations against CSRF, rate-limit expensive operations. | XSS, malicious import, oversized payload and CSRF tests. |
| NFR-04 | Media: reuse existing upload pipeline only after revising reference lifecycle and delivery authorization; private assets must not rely on obscurity of public URLs. | Attach/detach/delete tests, gallery/avatar regression, orphan cleanup and access checks. |
| NFR-05 | Accessibility: target WCAG 2.2 AA; keyboard tree/editor/assessment, visible focus, labels, status announcements, contrast and reduced motion. | Automated checks plus manual keyboard and screen-reader review in both themes. |
| NFR-06 | Performance: load tree metadata separately from step content; paginate large lists; bound import and assessment workloads. | Representative large-guide benchmark; numerical budgets agreed in Phase 2. |
| NFR-07 | Reliability: atomic multi-record writes, explicit save errors, concurrency protection, safe retries and recovery. | Interrupted save, conflicting edit and duplicate request tests. |
| NFR-08 | Compatibility: additive migrations where possible; preserve existing APIs, data and authentication. | Existing regression suites, migration rehearsal and rollback/recovery plan. |
| NFR-09 | Maintainability: follow repository conventions, pinned dependencies, Zod contracts, generated OpenAPI types, domain boundaries and automated tests. | Contract generation/checks, lint, build and integration suites. |
| NFR-10 | Portability and cost: core workflows require no paid AI; documented export and account deletion behavior. | Offline-from-AI workflow test and export/delete verification. |

## 6. Deferred scope

Public guide publishing/discovery/forking, collaboration, AI generation/grading, spaced repetition, flashcards, executable code, interactive simulations, institutional LMS functions and monetization. Design stable extension points without implementing speculative services. Basic content recovery and assessment revision history are required; full guide revision browsing is deferred unless explicitly approved.

## 7. Phase 2 decisions to resolve

- Exact eligible-step rules for optional subtrees, empty steps, mixed manual/gated requirements and edits after completion.
- Assessment grading policies, compatible revisions, manual review and attempt limits.
- Editor document format, block registry, schema migrations, Markdown mapping and portable media packaging.
- Media reference accounting migration, private delivery, quotas and cleanup race handling.
- Ownership model for future publishing, without exposing public endpoints now.
- Operational limits, retention/recovery windows, autosave conflict strategy and performance targets.
- Whether basic mastery is a release gate or a recommended enhancement; exact dashboard activity/streak semantics.

## 8. Release acceptance and Phase 0 exit

Release requires all MUST requirements, approved responsive designs, both themes, security and accessibility verification, migration rehearsal, existing-feature regression checks and end-to-end tests for create/import → study → assess → practice → resume/export. Track requirement IDs in implementation issues and tests.

Phase 0 is not closed by this document: runtime baseline, desktop/mobile visual audit, authorization/media audit and final requirements review remain pending. No repository changes or executed tests are claimed.

## 9. Source references

- https://github.com/shafayetullah7/solve-tracker-backend/blob/main/REQUIREMENTS.md
- https://github.com/shafayetullah7/solve-tracker-backend/blob/main/BACKEND_CONVENTIONS.md
- https://github.com/shafayetullah7/solve-tracker-backend/blob/main/DRIZZLE_CONVENTIONS.md
- https://github.com/shafayetullah7/solve-tracker-backend/blob/main/MEDIA_CONVENTIONS.md
- https://github.com/shafayetullah7/solve-tracker-backend/blob/main/src/database/schema/problems/problems.table.ts
- https://github.com/shafayetullah7/solve-tracker-frontend/blob/main/FRONTEND_CONVENTIONS.md
- https://github.com/shafayetullah7/solve-tracker-frontend/blob/main/src/components/app/AppShell.tsx
- https://github.com/shafayetullah7/solve-tracker-frontend/blob/main/src/styles/theme.css