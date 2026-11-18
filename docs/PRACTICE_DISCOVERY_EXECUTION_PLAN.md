# Practice discovery — synchronous execution plan

**Executes:** [PRACTICE_DISCOVERY_PHASED_PLAN.md](PRACTICE_DISCOVERY_PHASED_PLAN.md) (the “design doc”) — phases D0–D8 and the launch gate.  
**Status:** **E1 complete** (E2 not started).  
**Codename:** `DISCOVER`.

This is the runbook. The design doc says **what** to build and **why**; this file says **in which exact order**, **which files**, **which checks**, and **what the UI must look and behave like** before a step counts as done.

---

## 0. How to use this plan

### 0.1 Synchronous rules

1. **One step at a time, in order.** Steps are numbered `E<phase>.<step>`. A step starts only when the previous step’s **Done when** is fully true.
2. **Phases end with a gate.** Phase `E(n+1)` does not start until `E<n>`’s gate command passes **and** its UX review (§0.4) is signed off.
3. **No skipping UI states.** A UI step is not done until every state in its **UX acceptance** list has been seen in the browser against the demo seed (§0.5) and has a test where stated.
4. **No silent deviations.** If implementation must differ from the design doc, add a row to §11 (Change log) in the same commit and update the design doc section it affects.
5. **Each phase ends with a results doc** `docs/DISCOVER_E<n>_RESULTS.md` (same habit as existing `*_RESULTS.md`): what shipped, commands run with counts (tests, asserts), screenshots path, open issues.
6. **Feature stays dark** behind `DISCOVER_MODE` (§1) until the launch gate (E7) passes.

### 0.2 Progress tracker

| Phase | Design phase | Steps | Gate | Status |
| --- | --- | --- | --- | --- |
| E0 | D0 Decisions | 4 | Sign-off checklist | ☑ |
| E1 | D1 Owner controls | 12 | `pnpm verify:discover-e1` | ☑ |
| E2 | D2 People API | 8 | `pnpm verify:discover-e2` | ☑ |
| E3 | D3 Profile pages | 7 | `pnpm verify:discover-e3` | ☑ |
| E4 | D4 Discover people | 12 | `pnpm verify:discover-e4` | ☑ |
| E5 | D5 Topics and material | 12 | `pnpm verify:discover-e5` | ☑ |
| E6 | D6 Compare and borrow | 11 | `pnpm verify:discover-e6` | ☑ |
| E7 | Launch gate | 5 | `pnpm verify:discover` + §10 checklist | ☑ |
| E8 | D7 Follow (optional) | 6 | `pnpm verify:discover-e8` | ☑ |
| E9 | D8 Public web (optional) | 6 | `pnpm verify:discover-e9` + Security review | ☑ |

### 0.3 Step definitions of done

**Backend step** is done when: code + Zod schemas (`strictObject`) in place; unit tests (`*.spec.ts`) added; `pnpm lint`, `pnpm test`, `pnpm build` pass in `solve-tracker-backend`; if the HTTP contract changed, `pnpm api:export` committed and `pnpm api:check` passes.

**Frontend step** is done when: typed API module via generated OpenAPI types (`pnpm api:generate` in `solve-tracker-frontend`); component/unit tests added; `pnpm check` passes; the **UX contract** (§0.4) is satisfied for every screen touched.

**Migration step** is done when: schema edited in `src/database/schema/**`; `pnpm db:generate --name=<name>` output committed (SQL + snapshot); `pnpm db:check` passes; migration applied **twice** on the `_test` DB without error.

### 0.4 UX contract (applies to every UI step)

Each UI step lists which of these it must prove. “Proved” means seen in the browser on the demo seed **and** covered by a component test where marked 🧪.

| ID | Requirement |
| --- | --- |
| U1 | **Loading** skeleton matches final layout (no layout jump > 1 block); sections load independently 🧪 |
| U2 | **Empty / below-k** state: block hidden or replaced exactly as the design doc specifies; never an empty frame 🧪 |
| U3 | **Error** state: per-section `FormAlert` with Retry; other sections keep working 🧪 |
| U4 | **Private viewer** state (viewer’s own visibility `private`) shows the opt-in nudge where specified and nothing breaks |
| U5 | **Self** state (viewer looks at own profile/list) shows “This is how others see you” |
| U6 | **Unavailable** subject (private or unknown) renders the single shared unavailable state with identical text 🧪 |
| U7 | **Every card/list item shows a reason line** where the design doc specifies one 🧪 |
| U8 | **Every screen ends in an action** into the viewer’s own library (button/link present and working) |
| U9 | **Keyboard**: all actions reachable by Tab; rails scroll with arrow keys/Shift+wheel; combobox per WAI-ARIA; focus moves to page `h1` on route change |
| U10 | **Screen reader**: headings per section; charts have “Show as table”; icons have text; toggles announce state |
| U11 | **Mobile 375 px**: no horizontal page scroll; rails scroll-snap; sub-nav and search usable; tap targets ≥ 44 px |
| U12 | **Copy deck**: only approved wording (§E0.3); no “rank/top/beat/better/worse” 🧪 (grep test) |

### 0.5 Environment for every phase

```bash
# backend
cd solve-tracker-backend
export TEST_DATABASE_URL=postgresql://practice:practice_dev@localhost:5437/practice_tracker_test
pnpm db:migrate                       # dev DB
pnpm db:seed && pnpm db:seed:discover-demo   # available from E1.11
pnpm start:dev

# frontend
cd solve-tracker-frontend
VITE_DISCOVER_MODE=full pnpm dev      # http://localhost:3001
```

Demo login: `demo-viewer@discover.test` / `demo-password-1` (created by E1.11). Use this account for every UX review.

### 0.6 UX review procedure (end of each UI phase)

1. Start backend + frontend with the demo seed and `DISCOVER_MODE=full`.
2. For each screen in the phase’s **Review list**, capture desktop (1280 px) and mobile (375 px) screenshots of every state listed, into `docs/discover-ux/e<n>/<screen>-<state>-<width>.png`.
3. Walk the journeys that the phase makes walkable (listed in each phase header) and note friction in the results doc.
4. Run axe on each new route (`@axe-core/playwright`, same as `e2e/auth-a11y-smoke.spec.ts`); zero serious/critical violations.
5. Sign off in the results doc: “UX review passed — <date> — <name>”.

---

## 1. Cross-cutting decisions made by this plan

These refine the design doc; they are recorded in §11 as well.

| Topic | Decision |
| --- | --- |
| Feature flag | `DISCOVER_MODE=off \| sharing \| full` (backend env) and `VITE_DISCOVER_MODE` (frontend). `off`: nothing visible. `sharing`: owner controls (E1) visible; people/discover reads only allowed for the viewer’s own handle (self preview). `full`: everything. Replaces the design doc’s single boolean so owner controls can go live before launch. |
| Module boundary | All read logic for other users lives in `src/modules/discover/` (people + discover controllers in one module) and passes through `discover/visibility.ts`. No other module may query another user’s rows. |
| Thresholds and weights | One file: `src/modules/discover/discover.config.ts` (k values, rail sizes, weights, cache TTLs, rate limits). Tests import from it. |
| Copy deck | One file: `solve-tracker-frontend/src/lib/discover/copy.ts`. Components never inline discovery wording. |
| Analytics | `POST /discover/events` (batch, allow-listed names) writes `discover_events`; frontend helper `trackDiscover(event, surface)`. |
| View counting | Increment at most once per (viewer, subject, UTC day) via in-memory LRU; self-views excluded. |
| Caching | In-memory TTL caches (5 min) keyed by viewer or `topicKey`; global `discoverVersion` counter bumped on any visibility/goal/topic-share change busts all caches. |
| Rate limiting | Reuse the in-memory limiter pattern from `src/modules/auth/risc/google-risc-limiter.ts` as `discover-rate-limit.guard.ts`, keyed by user id, buckets from `discover.config.ts`. |

---

## E0 — Decisions and requirements (D0)

**Walkable journeys after phase:** none (docs only).

### E0.1 Amend REQUIREMENTS

- **File:** `solve-tracker-backend/REQUIREMENTS.md`.
- **Do:** §3 bullet “Every problem and topic is private” → “private by default; owners may opt in to practice sharing (**FR-10**)”. Add **FR-10 Practice discovery** with: visibility levels, never-exposed list, k thresholds, signed-in-only viewing, journeys J1–J8 as acceptance (link design doc §2.4). Move “Sharing” row from §9 to FR-10 reference. Keep feeds/leaderboards in §10. (FR-09 remains Resend email delivery.)
- **Done when:** diff reviewed; no contradictions with §3/§10 remain (grep “private to its owner”).

### E0.2 Decision record

- **File:** new `docs/DISCOVER_E0_DECISIONS.md`.
- **Do:** lock values: `practice_visibility` enum, `practice_goal` enum + labels, k = 3 / 5 / 10, rail rules and weights (design §2.7), rate limits, cache TTLs, `DISCOVER_MODE` semantics (§1), reserved handles `discover` and `u`, house account `@starter` (name “Practice starter lists”, email `starter@practice.invalid`, no password).
- **Done when:** every value later placed in `discover.config.ts` appears here.

### E0.3 Copy deck

- **File:** section in `DISCOVER_E0_DECISIONS.md` (becomes `copy.ts` in E1.9).
- **Do:** write every user-facing string: nav label, sub-nav labels, rail titles, reason-line templates, empty/below-k/unavailable messages, onboarding sheet, visibility panel options and helper text, never-shared line, toasts (copy/add results), insight templates, dashboard cards, banners. Include the forbidden-words list for U12.
- **Done when:** all strings in design doc §5 wireframes are covered and reviewed for tone (neutral, no ranking words).

### E0.4 Starter list content

- **File:** new `src/database/seed/starter-lists.data.ts` (data only, no code yet).
- **Do:** 8 topics (Arrays & Hashing, Two Pointers, Binary Search, Trees, Graphs, Dynamic Programming, Greedy, Monotonic Stack), 15–30 problems each: title, URL (public judge links), difficulty, one-line description per topic, ordered easy → hard.
- **Done when:** URLs validated with the existing URL normalizer unit (no duplicates within a topic); reviewed.

**Gate E0:** sign-off line in `DISCOVER_E0_DECISIONS.md` for E0.1–E0.4.

---

## E1 — Owner controls (D1)

**Walkable journeys after phase:** J8 settings part (share a topic, write a description).

### E1.1 Feature flag

- **Backend:** `src/config/environment.ts` add `DISCOVER_MODE: z.enum(['off','sharing','full']).default('off')`; add to `.env.example`, `test/auth-env.ts`, `test/production-environment.ts`. Helper `src/modules/discover/discover-mode.ts` (`isSharingEnabled`, `isFullEnabled`).
- **Frontend:** `src/lib/discover/flag.ts` (pattern of `src/lib/auth/google-oauth.ts`) reading `VITE_DISCOVER_MODE`; `.env.example` entry; tests with `vi.stubEnv`.
- **Done when:** env validation tests cover all three values + invalid value.

### E1.2 Migration: owner fields

- **Files:** `src/database/schema/users/users.table.ts` (`practiceVisibility text not null default 'private'`, `practiceGoal text`), `src/database/schema/topics/topics.table.ts` (`isPublic boolean not null default false`, `description text not null default ''`); check constraints for enums and `char_length(description) <= 280`.
- **Command:** `pnpm db:generate --name=discover-owner-controls`.
- **Done when:** migration-step DoD (§0.3); existing users read back `private`, `null`, `false`, `''`.

### E1.3 Shared schemas

- **File:** `src/common/schemas/practice-discovery.schema.ts`: `practiceVisibilitySchema`, `practiceGoalSchema`, `topicDescriptionSchema` (trim, ≤ 280 code points via `measureCodePoints`, no control chars).
- **Done when:** spec covers valid/invalid values and the 280 boundary.

### E1.4 Profile API

- **Files:** `src/modules/profile/schemas/profile.schema.ts`, `profile.service.ts`, `profile.repository.ts`.
- **Do:** `practiceVisibility`, `practiceGoal` in profile response and PATCH. On change, bump `discoverVersion` (stub function in `discover/discover-cache.ts`, real cache arrives E4).
- **Done when:** backend DoD; PATCH rejects unknown values with field errors.

### E1.5 Topics API

- **Files:** `src/modules/topics/**` schemas/service/repository.
- **Do:** `isPublic`, `description` in list/create/patch responses; PATCH accepts both. Bump `discoverVersion` on change.
- **Done when:** backend DoD.

### E1.6 Reserved handles

- **Files:** `src/common/schemas/user-handle.schema.ts` (+ `discover`, `u`), spec count assertion, `docs/USER_HANDLE_A0_RESULTS.md` list note.
- **Done when:** spec passes; existing users with those handles (if any) listed in results doc (expect none).

### E1.7 Contract regeneration

- **Commands:** backend `pnpm api:export`; frontend `pnpm api:generate`; backend `pnpm api:check`, `pnpm api:types:check`.
- **Done when:** generated types committed; frontend `pnpm typecheck` passes.

### E1.8 Integration tests

- **Files:** extend `scripts/test-profile-integration.mjs` and `scripts/test-topics-integration.mjs`.
- **Assert:** defaults; PATCH round-trips; invalid enum → 400 with field; description 281 chars → 400; topic of user A not patchable by user B (existing ownership still holds).
- **Done when:** both scripts pass on `_test` DB.

### E1.9 Frontend: copy deck and API

- **Files:** `src/lib/discover/copy.ts` (from E0.3), `src/lib/discover/copy.test.ts` (forbidden-words test, U12), profile/topics API module decoders extended.
- **Done when:** frontend DoD.

### E1.10 Frontend: Practice visibility panel

- **Files:** `src/components/profile/ProfilePracticeVisibilityPanel.tsx` (+ test), mounted in `src/routes/app/profile.tsx` after About, only when mode ≠ `off`.
- **Behaviour:** radio group (fieldset/legend) with three options + helper text; goal select (optional, “Not set”); never-shared line always visible; Save with pending state; field errors via existing `applyProfileApiError`; “View as others” and “Copy link” rendered **disabled** with tooltip “Available when Discover launches” in `sharing` mode and while `private`; system-handle hint opens `ProfileHandleEditorDialog`.
- **UX acceptance:** U1, U3, U9, U10, U11, U12. Tests: selecting option + save sends PATCH; never-shared line present in all states; disabled preview while private.
- **Done when:** frontend DoD + review screenshots (private, summary, topics, saving, error).

### E1.11 Frontend: Topics page share control

- **Files:** `src/components/topics/TopicShareControl.tsx` (+ test), wired into `src/routes/app/topics/index.tsx`.
- **Behaviour:** per row a menu button showing 🔒 Private / 🌐 Public (icon + text); menu: toggle, description textarea (live counter “x / 280”), Save; when visibility < `topics` all controls disabled and one banner “Topic sharing is off” with **Share topics** (PATCH visibility → `topics` after confirm dialog).
- **UX acceptance:** U1, U3, U9 (menu keyboard), U10 (toggle announces “Public”/“Private”), U11, U12.
- **Done when:** frontend DoD + screenshots (sharing off banner, private row, public row with description, saving, error).

### E1.12 Demo seed and gate script

- **Files:** `scripts/seed-discover-demo.ts`, package script `db:seed:discover-demo`; `scripts/verify-discover-e1.mjs`, package script `verify:discover-e1`.
- **Seed:** refuses when `NODE_ENV=production`; idempotent (handles `demo-*`); creates `demo-viewer` (password login, visibility `private`, 40 problems, topics Arrays/Strings/DP) and ~20 users covering: each visibility level; each goal; sizes 8/40/120/400; cadences (active 2, 6, 11 of 12 weeks via backdated `created_at`/`solved_at`); overlapping `normalized_name` topics (“DP” vs “dp”); public topics with/without description; one topic shared by only 2 owners (below k); one private user with a public-looking topic (must never surface).
- **Verify script:** require `_test` DB; `pnpm build`, `pnpm test`, `pnpm db:check`, profile + topics integration; frontend `pnpm check`.
- **Done when:** `pnpm verify:discover-e1` passes.

**Gate E1:** `pnpm verify:discover-e1` + UX review (§0.6) of profile panel and topics share control + `DISCOVER_E1_RESULTS.md`.

---

## E2 — People read API and visibility core (D2)

**Walkable journeys after phase:** none in UI (API only); self preview via API.

### E2.1 Discover module skeleton

- **Files:** `src/modules/discover/discover.module.ts`, `discover.config.ts`, `discover-mode.ts` (from E1.1), `discover-cache.ts` (TTL map + `discoverVersion`), registered in `app.module.ts`.
- **Do:** controller-level guard `DiscoverModeGuard`: `off` → 404 for all; `sharing` → only self handle allowed; `full` → all.
- **Done when:** guard spec covers the 3 modes × self/other.

### E2.2 Visibility core

- **File:** `src/modules/discover/visibility.ts` (+ spec).
- **Functions:** `findSubjectByHandle(handle)` (case-insensitive) → `{ userId, visibility } | null`; `assertViewable(subject, viewerId, level)` → throws uniform `PROFILE_NOT_FOUND`; `publicTopicFilter()` SQL fragment (`is_public and owner visibility = 'topics'`); projection functions `toPersonHeader`, `toTopicBoardRow`, `toPublicProblemRow` returning **only** allowed keys.
- **Done when:** spec asserts exact key sets of each projection and that `private`/unknown produce identical errors.

### E2.3 Progress for arbitrary user

- **Files:** `src/modules/progress/progress.service.ts`, `progress.repository.ts`.
- **Do:** methods take `userId` explicitly (they already receive it from the controller — confirm no implicit request coupling); export service from `ProgressModule` for `DiscoverModule`.
- **Done when:** existing progress tests and `test:problems:integration` unchanged and passing.

### E2.4 People endpoints

- **Files:** `src/modules/discover/people.controller.ts`, `people.service.ts`, `schemas/people.schema.ts`.
- **Endpoints:** `GET /people/:handle`, `/activity`, `/topics`, `/topics/:topicId`, `/topics/:topicId/problems` (design §6.2; `inViewerLibrary` via viewer’s `normalized_url` set; difficulty histogram 6 buckets). Pagination shape identical to `GET /problems` meta.
- **Done when:** backend DoD; OpenAPI exported.

### E2.5 Rate limiting

- **Files:** `src/modules/discover/discover-rate-limit.guard.ts` (+ spec) using limits from `discover.config.ts`.
- **Done when:** spec proves per-user buckets and 429 body uses the standard error schema.

### E2.6 Counters

- **Migration:** `discover_daily_counters (subject_type text, subject_id uuid, day date, views int, copies int, primary key (subject_type, subject_id, day))`; `pnpm db:generate --name=discover-counters`.
- **Code:** `discover-counters.service.ts` with LRU dedupe (§1); called from profile and public topic GETs; never stores viewer id.
- **Done when:** migration DoD; spec proves dedupe and self-exclusion.

### E2.7 Integration tests

- **File:** `scripts/test-discover-people-integration.mjs` (pattern of `test-topics-integration.mjs`), package script `test:discover-people:integration`.
- **Assert:** matrix (viewer × subject visibility × topic public/private) → status and exact JSON key sets; notes/email/ids/timestamps never present (deep key scan); private and unknown handle bodies **byte-identical**; case-insensitive handle; `sharing` mode allows self only; counters increment once per day per viewer; 429 after limit.
- **Done when:** passes on `_test` DB.

### E2.8 Gate script

- **File:** `scripts/verify-discover-e2.mjs`, `verify:discover-e2`: build, unit tests, `api:check`, `api:types:check`, people integration, frontend `pnpm typecheck` (types regenerated).

**Gate E2:** `pnpm verify:discover-e2` + `DISCOVER_E2_RESULTS.md` including the visibility matrix table as tested.

---

## E3 — Practice profile and public topic pages (D3)

**Walkable journeys after phase:** J4 (by direct URL), J8 preview (“View as others”).

### E3.1 Frontend API module

- **Files:** `src/lib/api/modules/people.api.ts` (+ tests): decoders for every response; `PROFILE_NOT_FOUND` mapped to a typed `unavailable` result (not an exception).
- **Done when:** frontend DoD.

### E3.2 Read-only dashboard components

- **Files:** `DashboardStatsStrip`, `DashboardActivityChart`, `DashboardPlatformGrid`, `DashboardStreakBadge`, `DashboardTopicProgressList` + tests.
- **Do:** add `hrefFor?: (row) => string | undefined`; when undefined, rows render as non-links. Add “Show as table” `<details>` to the activity chart if not present.
- **Done when:** tests assert no `href` contains `/app/problems` in read-only mode; dashboard behaviour unchanged (existing tests pass).

### E3.3 Profile route

- **Files:** `src/routes/app/u/[handle].tsx`; `src/components/people/PeopleProfileHeader.tsx`, `PeopleTopicBoard.tsx`, `PeopleUnavailable.tsx`, `PeopleViewAsBanner.tsx` (+ tests).
- **Layout:** design doc §5.3 exactly: header → stats strip → activity → platform mix | topic board → public lists (cards linking to topic pages). Similar rail slot left out until E4.10. “Compare with me” button **not rendered** until E6.
- **Data loading:** header first; activity, topics in parallel; each section owns its loading/error.
- **UX acceptance:** U1, U3, U5, U6, U9, U10, U11, U12; `<Title>` “@handle · Practice”; `noindex` meta.
- **Done when:** frontend DoD + screenshots: summary-only subject, topics subject, self, unavailable, section error, mobile.

### E3.4 Public topic route

- **Files:** `src/routes/app/u/[handle]/topics/[topicId].tsx`; `PeoplePublicProblemRow.tsx` (+ tests); `PeopleListHeader.tsx` (description, owner completion, copies30d, difficulty histogram with text alternative).
- **Behaviour:** owner-status and platform filters synced to URL search params; pagination 50; **Open** opens judge URL in new tab with `rel="noopener noreferrer"`; “You” column shows “✓ In library” (from `inViewerLibrary`) — Add buttons arrive in E6.
- **UX acceptance:** U1, U2 (empty filter result), U3, U5, U6, U9, U10, U11, U12.
- **Done when:** frontend DoD + screenshots.

### E3.5 Navigation state

- **File:** `src/lib/app/nav-active.ts` (+ test): add `"discover"` section for `/app/discover*` and `/app/u/*` (nav item itself arrives in E4.9).
- **Done when:** tests for new paths; existing ones unchanged.

### E3.6 Self preview wiring

- **Do:** enable “View as others” and “Copy link” in the visibility panel and topic share menu when mode ≠ `off` and visibility ≠ `private` (self preview works in `sharing` mode thanks to E2.1). Copy link uses `navigator.clipboard` with fallback text field and a toast.
- **Done when:** tests for enabled/disabled states; manual check in `sharing` mode.

### E3.7 Gate script

- **File:** `scripts/verify-discover-e3.mjs`: E2 checks + frontend `pnpm check`.

**Gate E3:** `pnpm verify:discover-e3` + UX review (profile ×6 states, public topic ×5 states) + `DISCOVER_E3_RESULTS.md`.

---

## E4 — Discover: people (D4)

**Walkable journeys after phase:** J4 complete, J1 people part, J6 rail part.

### E4.1 Candidate pool query

- **Files:** `src/modules/discover/discover.repository.ts` (+ integration coverage in E4.11).
- **Do:** one query returning, for all eligible users (visibility ≠ private, ≥ 5 problems, not viewer): handle, name, avatar, goal, total/solved, platform counts, topic `normalized_name` set (only if visibility `topics`), active-weeks bitmap (12), solves this week, streak. Partial index `users (id) where practice_visibility <> 'private'` via `pnpm db:generate --name=discover-user-visibility-idx`.
- **Done when:** query plan checked with `EXPLAIN` on demo seed ×50 (record in results doc).

### E4.2 Rail scoring (pure)

- **File:** `src/modules/discover/rails.ts` (+ spec with fixtures).
- **Do:** pure functions per rail (Peers, A step ahead, Same goal, Consistent, Active) implementing design §2.7 with weights from `discover.config.ts`; each returns `{ person, reason: { kind, sharedTopics?, values } }`; deterministic tie-break by handle.
- **Spec must cover:** 4× cap and small-library rule for A step ahead; size band for Consistent; Active ordered by overlap before solves; viewer with no topics; candidate with `summary` (topic Jaccard 0).
- **Done when:** spec green with ≥ 1 golden test per rail.

### E4.3 Cache

- **File:** `discover-cache.ts` (real implementation): TTL map with `discoverVersion` in the key; size cap; spec.
- **Done when:** spec proves expiry and version busting.

### E4.4 Endpoints

- **Files:** `discover.controller.ts`, `discover.service.ts`, `schemas/discover.schema.ts`.
- **Endpoints:** `GET /discover/search`, `GET /discover/for-you` (rails pre-filtered: < 3 cards → omitted; `yourTopics`; `starterLists`; `goalPattern` field present but `null` until E5), `GET /discover/people`, `GET /people/:handle/similar`.
- **Done when:** backend DoD; OpenAPI exported.

### E4.5 Starter lists seed (prod-safe)

- **Files:** `src/database/seed/starter-lists.ts` (uses E0.4 data), wired into `scripts/seed.ts` (idempotent upsert by handle `starter` and topic `normalized_name`); house user has no password, visibility `topics`, all topics public with descriptions.
- **Done when:** seed run twice yields identical rows; the house account cannot log in (integration assert).

### E4.6 Events

- **Migration:** `discover_events (id, viewer_id, event, surface, created_at)` + index on `created_at`; `pnpm db:generate --name=discover-events`.
- **Endpoint:** `POST /discover/events` `{ events: [{ event, surface }] }` ≤ 20 per call, allow-listed names from `discover.config.ts`.
- **Done when:** backend DoD; unknown event → 400.

### E4.7 Frontend: API, flag routing, tracking

- **Files:** `src/lib/api/modules/discover.api.ts` (+ tests), `src/lib/discover/track.ts` (batched, flush on route change/visibility hidden), `src/lib/discover/paths.ts`.
- **Do:** routes under `/app/discover` and `/app/u` render the 404 page when mode ≠ `full` (self-preview exception for `/app/u/<me>` in `sharing`).
- **Done when:** frontend DoD.

### E4.8 Discover layout, search, For you, People

- **Files:** `src/routes/app/discover.tsx` (layout), `discover/index.tsx`, `discover/people.tsx`; components `DiscoverSubNav`, `DiscoverSearch` (combobox), `DiscoverRail`, `DiscoverPersonCard`, `DiscoverPersonRow`, `DiscoverReasonLine`, `DiscoverOptInBanner`, `DiscoverTopicChip`, `DiscoverStarterLists` (+ tests); pure `src/lib/discover/for-you-layout.ts` (+ test) implementing the fallback ladder and slot order (Same goal moves to top when goal set).
- **Behaviour:** design §5.5. Search: 250 ms debounce, min 2 chars, ≤ 10 options, `aria-activedescendant`, Enter opens first, Escape clears, “No practice profile with that handle”. People page: rail selector + filters (goal, platform, topic, active) in URL params, 20 per page.
- **UX acceptance:** U1, U2 (rails hidden < 3; fallback ladder), U3, U4 (opt-in banner), U7, U8 (View / Compare-placeholder hidden until E6), U9 (combobox, rails), U10, U11 (search icon collapse, snap rails), U12.
- **Done when:** frontend DoD + screenshots: private viewer, sharing viewer, viewer with goal, viewer with no topics (fallback to starter lists), search open/empty, People page with filters, mobile.

### E4.9 Onboarding sheet

- **Files:** `DiscoverOnboardingSheet.tsx` (+ test); state key `localStorage['discover.onboarding.v1']`.
- **Behaviour:** shown on first For you visit; 3 steps (design §2.8); goal and visibility saved through profile PATCH on **Start exploring**; Skip closes without writes; focus trapped; Escape = Skip.
- **UX acceptance:** U3, U9 (focus trap), U10, U11, U12.
- **Done when:** tests: shows once; Skip writes nothing; Start writes both fields.

### E4.10 Entry points

- **Files:** `AppSidebar.tsx` (Discover item between Topics and Profile, compass icon added to `src/icons`), dashboard `src/routes/app/index.tsx` + `DiscoverPeopleLikeYouCard.tsx`, profile page similar rail (`/people/:handle/similar`).
- **Behaviour:** sidebar item only when mode = `full`; dashboard card under topic progress, hidden when no peers, replaced by starter-lists nudge for viewers without topics.
- **UX acceptance:** U2, U3, U8, U9, U11, U12; `AppShell` drawer shows the new item on mobile.
- **Done when:** `AppShell.test.tsx` and nav tests updated; screenshots.

### E4.11 Tests

- **Integration:** `scripts/test-discover-integration.mjs` (`test:discover:integration`): on demo seed, each rail returns expected handles (golden list), private users never appear in any response (scan), below-5-problem users excluded, search prefix/case, house account appears only in starter lists.
- **E2E:** `e2e/discover-people.spec.ts`: **J4** (search → profile) and onboarding (first visit → choose goal → Same goal rail first). Requires seeded backend; document in `e2e/fixtures.ts`.
- **Done when:** both pass.

### E4.12 Gate script

- **File:** `scripts/verify-discover-e4.mjs`: E3 checks + discover integration + `pnpm db:check`.

**Gate E4:** `pnpm verify:discover-e4` + Playwright spec + UX review (For you ×6, People ×3, onboarding ×3, dashboard card ×2, sidebar desktop/mobile) + J4 walkthrough + `DISCOVER_E4_RESULTS.md`.

---

## E5 — Discover: topics and material (D5)

**Walkable journeys after phase:** J2, J3, J5, J7.

### E5.1 Indexes

- **Migration:** `topics (normalized_name) where is_public`, `problems (normalized_url)`; `pnpm db:generate --name=discover-topic-material-idx`.
- **Done when:** migration DoD; `EXPLAIN` for hub queries on demo seed recorded.

### E5.2 Topic key

- **Files:** backend `src/modules/discover/topic-key.ts`, frontend `src/lib/discover/topic-key.ts` (+ tests both): `topicKey = encodeURIComponent(normalized_name)`; decode validates with the same normalizer as `topic-name.ts`; > 100 chars → 404.
- **Done when:** round-trip tests incl. spaces, unicode, `/`.

### E5.3 Aggregates (pure + SQL)

- **Files:** `src/modules/discover/topic-material.repository.ts`, `topic-material.ts` (pure ranking, + spec).
- **Do:** lists ranking, commonly tracked, topic pattern, goal pattern, specialists, topic hints, community panel — all through `publicTopicFilter()` and k thresholds from config.
- **Spec must cover:** each aggregate at k − 1 (hidden/omitted) and k (shown); one-list-per-owner in top 10; description bonus; private owner’s public-flagged topic excluded.
- **Done when:** spec green.

### E5.4 Endpoints

- **Endpoints:** `GET /discover/topics`, `/discover/topics/:topicKey`, `/lists`, `/problems?excludeMine=`, `/discover/topic-hints`, `/discover/problems/:problemId/community` (viewer must own `problemId`, else 404); fill `goalPattern` in `/discover/for-you`; “more lists” field on `/people/:handle/topics/:topicId`.
- **Done when:** backend DoD; OpenAPI exported; types regenerated.

### E5.5 Topics directory and hub UI

- **Files:** `src/routes/app/discover/topics/index.tsx`, `[topicKey].tsx`; components `DiscoverTopicHubHeader`, `DiscoverListCard`, `DiscoverCommonProblemRow`, `DiscoverPatternCard`, specialists rail reuse `DiscoverRail` (+ tests).
- **Behaviour:** design §5.6. Hub header always shows viewer’s own state and **Open in library** (library filtered to the viewer’s topic of that name) or **Create this topic**. Empty hub = header + pattern (if k) + starter list (if any) + “Be the first to share…” linking to Topics page.
- **UX acceptance:** U1, U2, U3, U7, U8, U9, U10, U11, U12.
- **Done when:** frontend DoD + screenshots: rich hub, empty hub, below-k pattern, viewer without topic, mobile.

### E5.6 Topics page hints

- **Files:** `src/components/topics/TopicCommunityHint.tsx` (+ test), Topics page wiring; created-topic success state shows the hint.
- **UX acceptance:** U2 (hidden below k), U8, U11, U12.

### E5.7 Library ideas panel

- **Files:** `src/components/discover/DiscoverIdeasPanel.tsx` (+ test), mounted in `src/routes/app/problems/index.tsx` only when exactly one topic filter is active.
- **Behaviour:** collapsed by default with count; expands to ≤ 6 rows; lazy-load via `IntersectionObserver`; collapsed state in `localStorage['discover.ideas.collapsed']`; **+ Add** creates problem with that topic pre-filled (state machine shared with E6.4 — implement the reducer now in `src/lib/discover/add-state.ts`).
- **UX acceptance:** U1, U2 (< 3 → hidden), U3, U8, U9, U10, U11, U12.

### E5.8 Problem detail community panel

- **Files:** `src/components/discover/DiscoverCommunityPanel.tsx` (+ test), mounted in `src/routes/app/problems/[id].tsx` below metadata; lazy-loaded.
- **UX acceptance:** U1, U2, U3, U8, U11, U12.

### E5.9 For you goal pattern and public topic “More lists”

- **Do:** render `goalPattern` card slot via `for-you-layout.ts` (update tests); “More <topic> lists” rail on public topic page.
- **UX acceptance:** U2, U7, U8, U11.

### E5.10 Integration tests

- **Extend** `scripts/test-discover-integration.mjs`: hub contents on demo seed (golden), k boundaries using the seed’s 2-owner topic, community panel ownership 404, excludeMine correctness, private user’s data absent from every aggregate.

### E5.11 E2E

- **File:** `e2e/discover-topics.spec.ts`: **J2** (create topic → hint → hub → open list) and **J3** (library filtered to DP → ideas panel → Add → row shows Added ✓).

### E5.12 Gate script

- **File:** `scripts/verify-discover-e5.mjs`: E4 checks + extended integration.

**Gate E5:** `pnpm verify:discover-e5` + Playwright + UX review (directory ×2, hub ×5, topics hints ×2, ideas panel ×4, community panel ×3, goal pattern ×2) + J2, J3, J5, J7 walkthroughs + `DISCOVER_E5_RESULTS.md`.

---

## E6 — Compare, borrow, benchmarks, sharer feedback (D6)

**Walkable journeys after phase:** all J1–J8.

### E6.1 Side computation

- **File:** `src/modules/discover/compare.ts` (+ spec): `computeSide(userId, weeks)` → totals, solves/week, active weeks, streak, platform shares, topic shares/completion — used for viewer, subject, and peers (medians).
- **Spec:** viewer side equals values derivable from `GET /progress` + `/progress/activity` for the same user.

### E6.2 Insights engine

- **File:** `src/modules/discover/insights.ts` (+ spec): ordered rules (cadence gap, top-topic concentration, focus gap per topic, missing public topic, platform concentration), each `(me, them) → { text, action } | null`, max 4, templates from config mirroring the copy deck.
- **Spec:** never references a non-public topic of the subject; neutral words only.

### E6.3 Compare endpoints

- **Endpoints:** `GET /people/:handle/compare?weeks=`, `GET /discover/compare-peers?weeks=` (hidden fields when < 5 peers), `GET /discover/benchmark` (one insight).

### E6.4 Copy and add

- **Endpoint:** `POST /people/:handle/topics/:topicId/copy` — one transaction: find/create viewer topic by `normalized_name`; for each public problem, link existing by `normalized_url` or create; return `{ topicId, added, linked }`; increment copies counter once per (viewer, topic, day).
- **Frontend:** `add-state.ts` reducer (idle → adding → added | already | error) + `PeopleCopyTopicButton.tsx`; public topic page “You” column gets **+ Add**; toasts per copy deck.
- **Tests:** copy twice → second returns `added: 0`; partial duplicates; 404 for non-public topic; reducer transitions.

### E6.5 Compare page

- **Files:** `src/routes/app/u/[handle]/compare.tsx`; `CompareSummaryTable`, `CompareShareBars`, `CompareInsights` (+ tests); toggle “vs @handle | vs people like you”; `?focus=cadence|topics` reorders sections; window select 4/12/26 weeks.
- **Behaviour:** design §5.9; viewer left in brand colour; numeric labels on every bar; summary-only subject message.
- **UX acceptance:** U1, U3, U6, U8 (every insight has an action where defined), U9, U10 (table alternative), U11 (columns stack with sticky labels), U12.

### E6.6 Enable compare entry points

- **Do:** render “Compare with me” on profile header; “Compare” on person cards; Consistent rail links with `?focus=cadence`; topic contexts with `?focus=topics`.

### E6.7 Dashboard benchmark card

- **Files:** `DiscoverBenchmarkCard.tsx` (+ test) under the stats strip on `/app`.
- **Behaviour:** hidden < 5 peers (starter-lists nudge instead); one insight line; **Compare →** opens peers compare.
- **UX acceptance:** U1, U2, U3, U4 (works for private viewer), U8, U11, U12.

### E6.8 Sharer feedback

- **Endpoint:** `GET /users/me/share-stats?days=30`.
- **UI:** Topics page row “Viewed 23× · copied 4× this month” for public topics; visibility panel summary line.
- **UX acceptance:** U2 (hidden when 0/0), U10, U12.

### E6.9 Integration tests

- **File:** `scripts/test-discover-compare-integration.mjs`: compare sides vs `/progress`; insights only use public data; copy idempotency and counters; benchmark threshold.

### E6.10 E2E

- **File:** `e2e/discover-compare.spec.ts`: **J1** (dashboard card → people like you → profile → compare → copy topic → toast → library shows topic).

### E6.11 Gate script

- **File:** `scripts/verify-discover-e6.mjs`: E5 checks + compare integration.

**Gate E6:** `pnpm verify:discover-e6` + Playwright + UX review (compare ×6 states, benchmark ×3, add/copy states ×5, share stats ×2) + J1, J6, J8 walkthroughs + `DISCOVER_E6_RESULTS.md`.

---

## E7 — Launch gate

### E7.1 Full verification chain

- **File:** `scripts/verify-discover.mjs`, `verify:discover`: runs `verify:discover-e1` … `e6` sequentially (pattern of `verify-platform-cls.mjs`) + frontend `pnpm test:e2e -g discover`.
- **Done when:** passes on a clean `_test` DB.

### E7.2 Launch checklist (design doc §10)

Run every row on **staging** with `DISCOVER_MODE=full`, demo seed + starter lists. Record evidence (link to screenshot, test, or command output) per row in `docs/DISCOVER_LAUNCH_RESULTS.md`:

| # | Check | Evidence required |
| --- | --- | --- |
| 1 | J1–J8 walked end to end, each ending in an action | Walkthrough notes + Playwright J1–J4 green |
| 2 | Every discovery page has a contextual entry besides the sidebar | Placement map table ticked (design §4.3) |
| 3 | No empty rail/panel/hub; loading/error/below-k defined | Component tests list + k−1/k screenshots |
| 4 | Reason line on every person and list | Snapshot tests |
| 5 | Privacy: key-set tests, private absent everywhere, k enforced | `verify:discover` output |
| 6 | Onboarding + opt-in nudges | Screenshots private/sharing |
| 7 | Copy deck review; forbidden words absent | `copy.test.ts` + grep output |
| 8 | Accessibility | axe report per route, keyboard walkthrough notes |
| 9 | Mobile 375 px for For you, hub, profile, compare | Screenshots |
| 10 | Funnel events recorded for each journey start/end | `discover_events` query output |

### E7.3 Production rollout

1. Deploy backend + frontend with `DISCOVER_MODE=sharing` (owner controls live) at least one week before launch if not done already; announce “Share your practice — Discover is coming”.
2. Run `pnpm db:migrate` and `pnpm db:seed` (starter lists) in production.
3. Flip to `DISCOVER_MODE=full` / `VITE_DISCOVER_MODE=full` (frontend rebuild required for `VITE_*`).
4. Smoke: sign in as a real account, open For you, a hub, a profile, compare.

### E7.4 Launch banner

- Dismissible dashboard banner (copy deck) “New: Discover how others practice — your library stays private unless you share it” → `/app/discover`; dismissal in `localStorage['discover.launch-banner.v1']`.

### E7.5 Post-launch reviews

- Calendar reviews at **+2 weeks** and **+6 weeks** using `discover_events` and counters against design doc §13 targets. Any rail with click-through < 2% or journey completion < 10% gets a fix ticket or is removed. Record decisions in `DISCOVER_LAUNCH_RESULTS.md`.

**Gate E7:** checklist complete with evidence; flag on; reviews scheduled.

---

## E8 — Follow (D7, optional)

1. **E8.1 Migration** `user_follows (follower_id, followee_id, created_at)`, PK both, cascades; `pnpm db:generate --name=discover-follows`.
2. **E8.2 API** `PUT/DELETE /people/:handle/follow` (idempotent), `GET /users/me/following`, `GET /users/me/followers/count`; private targets hidden from lists but rows kept.
3. **E8.3 UI** Follow button on profile header (pressed state, `aria-pressed`); **Following** option in People rail selector; follower count in visibility panel; confirm when switching to private with followers.
4. **E8.4 Copy** “follow” wording added to copy deck now (not before).
5. **E8.5 Tests** integration (idempotency, cascade on account delete, private hiding) + component tests; UX contract U1–U3, U8–U12.
6. **E8.6 Gate** `verify-discover-e8.mjs`; add to `verify:discover`.

---

## E9 — Public web pages (D8, optional)

1. **E9.1 Decision record** for anonymous viewing, indexing default (`noindex`), OG image content.
2. **E9.2 Owner opt-in** `users.public_web boolean default false`; checkbox in visibility panel.
3. **E9.3 Block/report** minimal: block list per user; report endpoint writes to an admin table.
4. **E9.4 Anonymous API** read-only subset with IP rate limits; never exposes more than `summary` + public lists.
5. **E9.5 SSR route** `/u/:handle` with OG card, “Sign up to compare” CTA.
6. **E9.6 Security review** (run the repo’s security review process) before enabling.

---

## 10. Review lists per phase (screens × states to capture)

| Phase | Screen | States |
| --- | --- | --- |
| E1 | Visibility panel | private, summary, topics, saving, error, mobile |
| E1 | Topics share control | sharing off banner, private row, public row + description, saving, error |
| E3 | Profile | summary subject, topics subject, self, unavailable, section error, mobile |
| E3 | Public topic | default, filtered empty, self, unavailable, mobile |
| E4 | For you | private viewer, sharing viewer, with goal, no topics (fallback), mobile, error rail |
| E4 | Search | open with results, no match, keyboard focus |
| E4 | People page | each rail, filters applied, mobile |
| E4 | Onboarding | step view, after Skip, after Start |
| E4 | Dashboard card / sidebar | with peers, without peers, mobile drawer |
| E5 | Topics directory | with your topics, no topics |
| E5 | Topic hub | rich, empty, below-k pattern, viewer without topic, mobile |
| E5 | Ideas panel / Community panel | collapsed, expanded, hidden (< k), error |
| E6 | D6 Compare and borrow | 11 | `pnpm verify:discover-e6` | ☑ |
| E6 | D6 Compare and borrow | 11 | `pnpm verify:discover-e6` | ☑ |
| E6 | D6 Compare and borrow | 11 | `pnpm verify:discover-e6` | ☑ |

---

## 11. Change log (deviations from the design doc)

| Date | Step | Change | Design doc section updated |
| --- | --- | --- | --- |
| — | §1 | `DISCOVER_ENABLED` boolean → `DISCOVER_MODE=off\|sharing\|full` | §8 (frontend structure, flag note) |
| — | §1 | People and discover controllers share one `discover` module | §4.4 |
| — | §1 | Events via `POST /discover/events`; view dedupe per viewer/day | §6, §7 |
| — | E4.5 | Starter lists seeded through `db:seed` (prod-safe) instead of a migration | §7 |

---

**Next action:** execute **E2.1**.
