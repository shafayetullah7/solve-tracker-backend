# Practice — Phase 1 information architecture and UX specification

Status: **approved for R1 implementation** (2026-11-27). Phase 0 closed; hi-fi mockups waived per [PHASE_0_1_CLOSURE.md](./PHASE_0_1_CLOSURE.md).

## 1. Principles

Preserve the existing coding workflows, teal identity, semantic tokens, auth shell and generated API client. Learning is subject-neutral and private by default. Study and authoring are separate modes. No AI dependency or public publishing in the first release. Support light, dark and system appearance.

## 2. Navigation and route contract

| Destination | Proposed route | Behavior |
|---|---|---|
| Overview | `/app` | Resume and relevant activity |
| My guides | `/app/learning` | Search, filter, create, import |
| Guide overview | `/app/learning/:guideId` | Roadmap and progress |
| Study step | `/app/learning/:guideId/study/:stepId` | Focused reading |
| Guide editor | `/app/learning/:guideId/edit` | Structure and content |
| Edit step | `/app/learning/:guideId/edit/:stepId` | Deep-linked authoring |
| Assessment | `/app/learning/:guideId/assessments/:assessmentId` | Start or resume attempt |
| Attempt result | `/app/learning/:guideId/attempts/:attemptId` | Feedback and history |
| Problems | `/app/problems` | Existing library unchanged |
| Topics | `/app/topics` | Existing topics unchanged |
| Practice progress | `/app/practice/progress` | Existing coding analytics relocated |
| Settings | `/app/settings` | Appearance and preferences |

Keep existing profile and Discover paths and feature gates. Route names are proposals; reconcile with filesystem routing and generated path helpers before implementation. Preserve existing deep links, browser history and authentication return paths. Create menu offers guide, import, problem and topic; keep direct Add problem on library. Do not show future features as disabled navigation.

## 3. User journeys

- New learner: register -> optional choose learning/coding/both (skip available) -> overview -> create/import guide -> preview -> first step -> resume later. No forced tutorial or sample data.
- Coding-only returning user: overview -> existing queue or Problems -> external judge -> mark solved -> updated practice metrics. No guide setup requirement.
- Learning-only returning user: overview -> resume last step -> content -> required activity -> complete -> next eligible step. No irrelevant coding charts.
- Mixed user: study -> assigned problem -> match existing personal library record or add -> solve externally -> mark solved -> return to step; reflect status without duplicating problems.
- Author: guides -> blank or import -> edit hierarchy -> select step -> add blocks -> save -> preview study mode. Returning from preview preserves editor selection.

## 4. Screen specifications

| Screen | Primary action | Essential content |
|---|---|---|
| Overview | Resume learning or practice | Relevant active guides, queue, recent activity; separate learning and coding metrics |
| Guide library | Create/import | Search, active/completed/archived filters, list/cards, progress, last studied, resume, overflow actions |
| Guide overview | Start/resume | Title, description, progress fraction, expandable roadmap, required/optional indicators, edit/export |
| Study | Complete and continue | Breadcrumb, tree, reading content, activities, optional notes drawer, previous/next |
| Editor | Add step/block | Tree, selected step, block canvas, contextual inspector, save state, preview |
| Import | Confirm import | Paste/file input, format, hierarchy preview, warnings, validation errors, confirmation |
| Assessment | Submit | Instructions, pass threshold, question navigation, answer controls, unanswered count, review |
| Results | Continue or retake | Score, pass state, best valid score, feedback, attempt history |
| Practice progress | Open problems | Existing counts, topic/platform breakdown, streak and weekly activity |
| Settings | Select theme | System/light/dark; accessible controls |

### Overview wireframe

```text
[Navigation]  Overview                         [Create]
              Continue learning
              [Embedded Rust | 12/40 | Resume]
              Practice queue (only when relevant)
              [Problem title | platform | Open]
              Learning progress     Coding progress
              Recent activity (chronological, typed)
```

Empty overview offers create/import guide and add problem without requiring both. Load sections independently; a failing learning request must not block practice.

### Study wireframe

```text
[Rail] [Guide tree      ] [Breadcrumb       Notes]
       [Search steps    ] [Step title            ]
       [Progress 12/40  ] [Objectives            ]
       [Expanded parent ] [Reading / code / image]
       [ Current step   ] [Required activity     ]
       [ Next step      ] [Previous | Complete & next]
```

Tree selection and expansion are independent. Parent steps can contain content. Show own completion separately from subtree progress; optional work never implies required completion. Completion control explains unmet requirements and links to them. Keep next navigation available without falsely marking completion. Save last visited step, not just last completed. Notes are private and do not affect completion.

### Editor wireframe

```text
[Rail] [Tree + add] [Title | Saved | Preview] [Inspector*]
       [Step menu ] [Text block            ] [Required  ]
       [Move/indent] [Code block            ] [Settings  ]
                    [+ Add block           ]
```

*Inspector is contextual, not permanently open. Add sibling/child, rename, move, duplicate and delete with explicit scope. Keyboard alternatives to drag/drop. Preserve stable IDs when moving. Prevent cycles and cross-guide moves in MVP. Block picker supports rich text, code, images, resources, checklist, assessment and practical/coding activity references. Autosave with visible saving/saved/error states; retain unsaved edits and warn before navigation; resolve conflicts explicitly. Preview uses study renderer. No raw executable HTML or code execution.

### Import flow

Choose Markdown or JSON -> paste/upload -> parse -> preview editable title and hierarchy -> show unsupported syntax, invalid links and limits -> confirm -> atomic creation -> editor. Never silently discard content. No remote URL fetching in MVP. Export guide content separately from private learning records; JSON versioning defined in Phase 2.

### Assessment flow

Show requirements and pass threshold before starting. Render accessible typed controls (single/multiple choice, true/false, numerical and supported manual activities). Preserve draft answers if supported by Phase 2; never imply a draft is submitted. Review unanswered questions, confirm submission, show result only after server response. Display best valid score and latest score distinctly. Retakes do not erase history; incompatible revisions must be labeled. No client-side grading secrets. Manual review status must not appear as automatic pass.

## 5. Responsive and interaction rules

- Desktop: existing standard shell; focused rail + collapsible tree for study/editor. Reading column approximately 65–80 characters; wide code/tables scroll within their own block.
- Tablet: collapse global rail/tree as needed; notes and inspector in drawers. Never require three open panes.
- Mobile: single content pane, labeled navigation and tree buttons, full-screen editor/assessment, sticky actions only if they do not obscure content or keyboard. Test 320, 390, 768, 1024 and 1440 CSS pixels; breakpoints are proposed.
- Tree: keyboard arrows, Home/End, expand/collapse, visible focus, accessible current item; use a documented tree pattern or simpler nested disclosure navigation. Search reveals matching ancestors. Deep nesting uses bounded indentation and breadcrumbs.
- Dialogs restore focus, Escape closes non-destructive overlays, no drag-only operations. Screen-reader status for save and submission. Respect reduced motion and zoom. Use WCAG 2.2 AA as target; verify both themes.

## 6. State matrix

| State | UX response |
|---|---|
| Loading | Stable skeleton or localized loading; avoid layout jumps |
| Empty | Explain purpose and offer one primary action |
| Filter no results | Clear filters; do not imply no guides exist |
| Error | Actionable message and retry, preserve input |
| Unauthorized/missing | Non-disclosing unavailable state; return to library |
| Offline/save failure | Unsaved indicator, retry and recovery; no false success |
| Concurrent edit | Preserve local draft; reload/resolve explicitly |
| Delete | Confirm impact on children/content/progress; recovery policy per Phase 2 |
| Archived | Read-only or restore behavior per requirements; no accidental loss |
| Assessment pending | Disable duplicate submit, recover server outcome on retry |

## 7. Design system and public experience

Extend existing theme.css tokens, not hardcoded component colors. Add reading typography, code surface, tree selected/focus states, assessment feedback and editor affordances. Use system preference by default and explicit override; avoid SSR theme flash. Verify contrast, diagrams, syntax highlighting, forms and focus in both themes. Keep current brand as working direction. Landing copy: structured learning and coding practice in one workspace; demonstrate both, avoid promising AI/public guides. Existing users see non-blocking introduction and unchanged problem routes. No forced migration of topics into guides.

## 8. Validation and exit gate

Phase 1 **closed 2026-11-27**: journeys and screen responsibilities approved in this spec and companion `*_DESIGN.md` files. High-fidelity mockups and full scenario walkthrough list are **waived**; validate during implementation (Phase 3+). Editor library choice remains Phase 2 prototype work per A13.

## 9. Sources and limitations

Based on LEARNING_A0_RESULTS.md, LEARNING_REQUIREMENTS.md, LEARNING_BASELINE_AUDIT.md and practice-learning-roadmap.md. Existing source references: https://github.com/shafayetullah7/solve-tracker-frontend/blob/main/src/components/app/AppSidebar.tsx ; https://github.com/shafayetullah7/solve-tracker-frontend/blob/main/src/components/app/AppShell.tsx ; https://github.com/shafayetullah7/solve-tracker-frontend/blob/main/src/styles/theme.css . Proposed navigation labels, route paths, onboarding, layout modes and responsive thresholds are design decisions awaiting approval. Wireframes are conceptual, not screenshots or tested prototypes. No code or repository changes.