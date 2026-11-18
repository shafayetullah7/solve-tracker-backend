# Practice discovery — product design and phased execution plan

**Status:** **in progress** — **D0 complete** (requirements + decisions); execution **E1+** pending.  
**Codename:** `DISCOVER` (phases **D0–D8** below).

**Problem:** Every library is private. A user tracking problems has no reference point: they cannot see how other people structure their practice (which topics, which judges, how often, which problems), so they cannot judge whether their own practice is balanced, consistent, or ambitious enough — and they have nowhere to find good practice material made by people like them.

**Outcome:** Users can **opt in** to a read-only **practice profile**; **find** other practicers by name, by similarity, by goal, or by topic; **find practice material** (public topic lists, commonly tracked problems, typical topic mixes); **compare** themselves against people and peer groups; and **borrow** structure (a topic, a problem) into their own library — without exposing notes, emails, or anything the owner did not explicitly share.

**What this plan guards against:** shipping a search box and a profile page and calling it done. Discovery is designed here as a set of **user journeys** with defined entry points, content, ranking, empty states, and a **launch quality bar** (§10) that must pass before the feature is announced.

**References:** [REQUIREMENTS.md](../REQUIREMENTS.md) (§3 scope, §9 “Sharing”, §10 “Outside the initial scope”), [USER_HANDLE_PHASED_PLAN.md](USER_HANDLE_PHASED_PLAN.md) §7 (public-by-handle, handle search), [PLATFORM_CLASSIFICATION_PHASED_PLAN.md](PLATFORM_CLASSIFICATION_PHASED_PLAN.md) (stored `platform_slug`), [FRONTEND_CONVENTIONS.md](../../solve-tracker-frontend/FRONTEND_CONVENTIONS.md), [AUTH_CONVENTIONS.md](../../solve-tracker-frontend/AUTH_CONVENTIONS.md), [API_CLIENT.md](../../solve-tracker-frontend/API_CLIENT.md), [DRIZZLE_CONVENTIONS.md](../DRIZZLE_CONVENTIONS.md).

---

## 1. Brainstorm

### 1.1 Who wants this and why

| Person | Question they ask | What answers it |
| --- | --- | --- |
| Beginner, 30 problems in | “Am I practicing the right things?” | Topic mix of people a bit ahead of them; typical mix for their goal |
| Interview prepper | “What does a solid DP / graphs list look like?” | Ranked public lists on a topic hub |
| Contest regular | “Am I consistent enough?” | Cadence of similar people; peer benchmark on the dashboard |
| Plateaued learner | “What am I neglecting?” | Compare view: topics they practice that I don’t |
| Learner mid-topic | “What should I solve next in DP?” | Commonly tracked DP problems I don’t have yet |
| Friend / study group | “What is my friend working on this week?” | Search, profile, following |
| Sharer / coach | “Is anyone using my list?” | Views and copies of their public topics |

The common thread is **self-calibration**, not competition. The UI should answer “how do I compare and what should I try next”, never “who is #1”.

### 1.2 Ideas considered

| Idea | Verdict | Reason |
| --- | --- | --- |
| Public practice profile by `@handle` | **Core** | Smallest unit of discovery; handle infra exists |
| Handle / name search | **Core** | Find friends and known people |
| Suggestion rails (peers, a step ahead, same goal, consistent) | **Core** | Discovery without knowing names; each rail answers a different question |
| Topic hubs (everything about one topic across the community) | **Core** | “What” discovery; topics already have `normalized_name` for cross-user matching |
| Ranked public topic lists (“syllabi”) | **Core** | The most reusable artifact one user can give another |
| Commonly tracked problems per topic | **Core** | Answers “what next”, aggregates only public lists |
| Contextual hooks in existing pages | **Core** | Discovery must appear where the question arises, not only in a new tab |
| Side-by-side compare with insights | **Core** | Directly serves “get a better idea about himself” |
| Peer benchmark card on dashboard | **Core** | Self-calibration without visiting anyone |
| “Add to my library” / “Copy topic” | **Core** | Turns discovery into action; reuses create + duplicate detection |
| Practice goal on profile (interview / contests / fundamentals / coaching) | **Core** | Enables “same goal” discovery and goal patterns |
| Sharer feedback (views / copies) | **Core** | Supply side: people share more when they see it helps |
| Curated starter lists from a house account | **Core** | Cold start: Discover is never empty |
| Follow + following activity | **Later (D7)** | Study groups; adds a table and a list, no feed |
| Anonymous public pages + share link + OG image | **Later (D8)** | Growth lever; needs SSR + abuse care |
| Same-institution discovery (from education entries) | **Later, separate opt-in** | Strong signal but sensitive; revisit after D6 |
| Global leaderboards | **Rejected** | Grind shame; REQUIREMENTS §10 excludes leaderboards |
| Social feed / likes / comments | **Rejected** | Moderation cost; §10 excludes feeds |
| Showing notes or solution text | **Rejected** | Notes are personal; privacy promise |
| Exact solve timestamps / “who viewed my profile” | **Rejected** | Invasive; weekly buckets and anonymous counts are enough |

### 1.3 Design principles

1. **Private by default.** Nothing about a user is discoverable until they turn it on, and they always see exactly what others see.
2. **Aggregates before items.** Counts, percentages, and weekly buckets first; individual problems only inside topics the owner explicitly made public.
3. **Notes, email, user ids, and exact timestamps never leave the owner.**
4. **Comparison is framed as insight, not rank.** Percent and share-of-practice beats raw totals; copy says “they focus more on…”, not “they beat you”. No rank numbers anywhere.
5. **Every rail says why.** Each suggested person or list carries a one-line reason (“Shares Graphs, DP · solves ~8/week”).
6. **Every discovery screen ends in an action** in the viewer’s own library (open, compare, add problem, copy topic, filter my library).
7. **Discovery lives where the question arises** — dashboard, topics, library, problem detail — not only behind a nav item.
8. **No empty rails.** A rail with no good content is hidden, never shown empty; the page always has a fallback (topic hubs, starter lists).
9. **Reuse the dashboard visual language.** Someone else’s profile looks like a read-only dashboard, so it is instantly readable.
10. **No existence leaks.** A private or unknown handle returns the same 404 and the same UI.

---

## 2. Discovery model — who, what, and how

### 2.1 What a user wants to discover

Discovery has two objects: **people** (who) and **practice material** (what). Most journeys start on one and end on the other.

**People (who)**

| ID | Target | Definition | Why the user wants them |
| --- | --- | --- | --- |
| P1 | **Peers** | Similar topics, similar library size (0.5–2×), similar platforms | “Is my practice normal for someone like me?” |
| P2 | **A step ahead** | Share ≥ 1 topic; 1.5–4× my solved count in shared topics; active recently | Reachable role models — not 50× ahead |
| P3 | **Topic specialists** | Large, well-completed public topic in a topic I care about | “Who really knows Graphs, and how did they practice it?” |
| P4 | **Same goal** | Same practice goal (interview / contests / fundamentals / coaching), ideally same main judge | “What do other interview preppers do?” |
| P5 | **People I know** | Friends, classmates, teammates | Accountability, study groups |
| P6 | **Consistent practicers** | Active ≥ 8 of the last 12 weeks, similar size band | Habit role models |

**Practice material (what)**

| ID | Target | Definition | Why the user wants it |
| --- | --- | --- | --- |
| M1 | **Public lists** | Public topics with their problem lists, ranked per topic | Ready-made syllabus |
| M2 | **Commonly tracked problems** | Problems appearing in ≥ 3 different owners’ public lists of a topic | “What should I solve next?” |
| M3 | **Topic patterns** | Topics that co-occur with a topic (“Graphs practicers also practice BFS 68%, Trees 54%”) | Find neighbouring topics I’m missing |
| M4 | **Goal patterns** | Typical topic and platform mix for a goal | “What does interview prep usually cover?” |
| M5 | **Peer benchmarks** | Median cadence / active weeks / topic spread of my peer group | Calibrate myself without looking at anyone in particular |

### 2.2 How they discover (mechanisms)

| Mechanism | User intent | Where | Targets |
| --- | --- | --- | --- |
| **Search** | “I know who I’m looking for” | Discover header (always visible) | P5, any person |
| **Personal rails** | “Show me people relevant to me” | Discover → For you | P1, P2, P4, P6 |
| **Topic hubs** | “I’m working on X” | Discover → Topics; links from my topics | P3, M1, M2, M3 |
| **Contextual hooks** | Question arises while doing something else | Dashboard, Topics page, library topic filter, problem detail, add-problem success | M1, M2, M5, P1 |
| **Graph walking** | “More like this person / list” | Profile “Similar practicers” rail; list page “More Graphs lists” | P1, P3, M1 |
| **Compare** | “How exactly do I differ?” | Profile → Compare; benchmark card | M5, P1/P2 |
| **Share link / invite** | “Look at my practice” | Visibility panel, public topic page | P5 |
| **Following** (D7) | “Keep up with these people” | Discover → Following | P5 |

### 2.3 Question → answer map

Every question a user brings must have a home, an entry point, and an end action.

| User question | Answered on | Primary entry point(s) | End action |
| --- | --- | --- | --- |
| Am I on track? | Dashboard peer benchmark → Compare | Dashboard card | Copy topic / filter my library |
| Who practices like me? | Discover → For you (Peers rail) | Sidebar Discover; dashboard “People like you” | View profile → Compare |
| Who is a little ahead of me? | For you (A step ahead rail) | Discover | Compare → copy topic |
| Is there a good list for topic X? | Topic hub → Public lists | Topics page row hint; Discover → Topics | Copy topic |
| What should I solve next in X? | Topic hub → Commonly tracked; library “Ideas” panel | Library filtered to one topic | Add problem |
| What else goes with X? | Topic hub → Pattern card | Topic hub | Create / copy neighbouring topic |
| What do interview preppers do? | For you (Same goal rail) + goal pattern card | Discover; goal picker in onboarding | Copy topics |
| Am I consistent enough? | Peer benchmark; Consistent rail | Dashboard activity section | View profile |
| Is this problem worth doing? | Problem detail → “In the community” | Problem detail | Open list → profile |
| Where is my friend? | Search | Discover header | View profile / follow |
| Is anyone using my list? | Topics page share stats | Topics page, visibility panel | Improve / share list |

### 2.4 User journeys

Each journey lists the trigger, the path through real screens, what the user sees, and how it ends. These journeys are the **acceptance scripts** for the launch quality bar (§10).

#### J1 — “Am I on track?” (beginner, self-calibration)

- **Trigger:** Rafi has 40 problems. On the dashboard he sees **How you compare** (§5.8): “You were active 4 of 12 weeks · people like you: 8 of 12. You focus 70% on Arrays · people like you: 35%.”
- **Path:** taps **See people like you** → Discover / For you, Peers rail, each card with a reason (“Shares Arrays, Strings · LeetCode · ~5/week”) → opens @mina → reads her topic board → **Compare with me**.
- **Sees:** side-by-side shares; insight “Graphs is 20% of @mina’s practice and 0% of yours” with **Copy her Graphs list**.
- **Ends:** copies the topic; toast “Added 18 problems, 2 were already in your library” with **Open topic**.
- **Edge cases:** fewer than 5 peers → benchmark card hidden, dashboard shows the starter-lists nudge instead; Rafi private → everything still works, plus a gentle “share your practice” banner.

#### J2 — “I’m starting Graphs” (topic-driven)

- **Trigger:** Ayesha creates topic **Graphs** on the Topics page. The success state and the row show “**34 people practice Graphs** · 12 public lists → Explore”.
- **Path:** Topic hub `Graphs` → header with community stats → **Public lists** ranked (§2.7) with reason lines (“60 problems · 80% solved by owner · copied 41×”) → opens a list → reads the problem table with difficulty spread.
- **Ends:** **Copy to my Graphs** merges into her existing topic (name match), or **+ Add** per problem.
- **Edge cases:** topic with 0 public lists → hub shows Pattern card + starter list (if one exists) + “Be the first to share a Graphs list”; never an empty page.

#### J3 — “What should I solve next in DP?” (mid-topic)

- **Trigger:** In the library filtered to topic **DP**, below the results, a collapsible panel: **Ideas from the community (6)** — commonly tracked DP problems not in his library.
- **Path:** expands → sees rows “Coin Change · LeetCode · Medium · in 9 lists” → **+ Add** → row becomes “Added ✓”.
- **Ends:** problem in his library tagged DP (topic pre-filled from the filter).
- **Edge cases:** fewer than 3 qualifying problems → panel hidden; panel remembers collapsed state per user (`localStorage`).

#### J4 — “Find my friend” (known person)

- **Trigger:** a classmate says “I’m @tanvir”.
- **Path:** Discover → search “tan” → combobox shows `@tanvir · Tanvir H. · 120 solved` → Enter.
- **Ends:** profile → **Compare** or (D7) **Follow**. If Tanvir is private: “This practice profile isn’t available” (same as unknown) plus “Ask them to share their practice from Profile → Practice visibility”.

#### J5 — “I’m preparing for interviews” (goal-driven)

- **Trigger:** first Discover visit; onboarding sheet asks for an optional **practice goal**; Mina picks **Interview prep**.
- **Path:** For you shows **Same goal** rail first for her, and a **Goal pattern** card: “Interview preppers usually cover Arrays 90%, Trees 75%, DP 70%, Graphs 60% · mostly LeetCode”. Each topic chip shows ✓ if she has it.
- **Ends:** taps a missing chip (Trees) → Trees topic hub → copies a list.

#### J6 — “Why am I inconsistent?” (habit)

- **Trigger:** dashboard activity section shows “Active 5 of 12 weeks · people like you: 9” with **See consistent practicers**.
- **Path:** Discover / For you, **Consistent** rail (similar size band, so reachable) → profile activity chart shows steady small weeks (“3–5 solved most weeks”).
- **Ends:** user has a concrete cadence reference; compare page highlights “Solved / week” and “Active weeks” rows first when entered from this rail (`?focus=cadence`).

#### J7 — “Is this problem worth doing?” (problem-driven)

- **Trigger:** problem detail page shows **In the community**: “In 7 public lists · Graphs, BFS” with the two most-copied lists.
- **Path:** opens a list → sees the problem in context (what comes before/after it) → opens the owner’s profile.
- **Ends:** copies the list or adds neighbouring problems.
- **Edge cases:** in fewer than 3 lists → panel hidden (no thin data, no privacy inference).

#### J8 — “I want to share my DP list” (supply side)

- **Trigger:** Topics page; visibility is `topics`; user toggles **DP → Public**, adds a short description (“Easy → hard, do in order”).
- **Path:** **View as others** shows exactly the public topic page; **Copy link** gives `/app/u/:handle/topics/:id`.
- **Ends:** a week later the Topics row shows “Viewed 23× · copied 4× this month”. Counts are anonymous — never who.
- **Edge cases:** visibility `summary` → toggles disabled with explanation and one-click “Share topics too”.

### 2.5 Discovery loops

The feature works only if both loops close.

```text
Consumer loop                                Supply loop
-------------                                -----------
Practice ─► dashboard signal                 Share a topic (public + description)
   ▲          (benchmark, “people like you”)     │
   │                  │                          ▼
   │                  ▼                       Shows up in topic hubs, rails, problem detail
Borrow  ◄── Compare ◄── Profile / topic hub      │
(copy / add)                                     ▼
                                             Views / copies feedback on Topics page
                                                 │
                                                 └─► motivation to share more / improve list
```

If the supply loop is missing (no feedback), few people share and every consumer surface is empty. That is why sharer feedback (J8) and starter lists (§2.8) are core, not polish.

### 2.6 Content inventory

Every block that appears on a discovery surface, what it contains, where the data comes from, and the minimum visibility required.

| Block | Contents | Source | Min. visibility of subject | Appears on |
| --- | --- | --- | --- | --- |
| **Person card** | Avatar, name, `@handle`, goal chip, solved total, streak, top platforms, **reason line** | `users`, progress | `summary` | Discover rails, “See all”, similar rail, topic hub specialists |
| **Person row** | Compact card for lists / search results | same | `summary` | Search, active list, following |
| **Profile header** | Avatar, name, handle, bio, goal, “practicing since” (month), streak, actions | `users`, activity | `summary` | Profile |
| **Stats strip** | Solved / unsolved / total / this week | progress | `summary` | Profile, compare |
| **Activity chart** | 12 weekly buckets added/solved | activity | `summary` | Profile, compare |
| **Platform mix** | Share per platform | progress | `summary` | Profile, compare, person card (top 2) |
| **Topic board** | Topic name, solved/total, %, Public badge | topics + progress | `topics` | Profile |
| **List card** | Topic name, owner, description, problem count, owner completion %, difficulty spread bar, copies (30 d), reason | topics, problems, counters | `topics` + public topic | Topic hub, profile, problem detail, graph walking |
| **Public problem row** | Title, platform, judge ID, difficulty/rating, owner status, Open, + Add state | problems | public topic | Public topic page |
| **Commonly tracked row** | Title, platform, difficulty, “in N lists”, In-your-library ✓, + Add | aggregate over public topics | k ≥ 3 owners | Topic hub, library ideas panel |
| **Pattern card** | Co-occurring topics with %, ✓ for topics viewer has | aggregate | k ≥ 10 users | Topic hub, goal pattern on For you |
| **Benchmark card** | Viewer vs peer-group medians (active weeks, solves/week, topic spread, top topic share) | aggregate over peers | k ≥ 5 peers | Dashboard, compare (“vs peers” toggle) |
| **Insight sentence** | Rule-based sentence + action | compare / benchmark | as source | Compare, benchmark card |
| **Community panel** | “In N public lists” + top 2 list cards | aggregate | k ≥ 3 | Problem detail |
| **Topic hint** | “N people practice X · M public lists → Explore” | aggregate | k ≥ 3 | Topics page rows, topic created state |
| **Opt-in nudge** | One sentence + button to visibility panel | viewer state | — | Discover, dashboard |
| **Share stats** | Views / copies this month (anonymous) | counters | owner only | Topics page, visibility panel |

### 2.7 Selection and ranking rules

All candidate sets exclude the viewer, private users, users with fewer than 5 problems, and (D7) blocked users. Ties break deterministically by handle. Rails show at most 8 cards; each has **See all**.

| Rail / list | Candidates | Ordering | Reason line |
| --- | --- | --- | --- |
| **Peers** (P1) | ≥ 1 shared topic **or** platform similarity ≥ 0.8 | `0.5·topicJaccard + 0.2·platformSim + 0.2·sizeSim + 0.1·recentActivityOverlap` | “Shares Graphs, DP · LeetCode · ~5/week” |
| **A step ahead** (P2) | ≥ 1 shared topic; solved in shared topics 1.5–4× viewer’s (if viewer < 10, viewer + 10…60); active in last 4 weeks | shared-topic overlap, then recency | “Solved 3× more in your shared topics” |
| **Same goal** (P4) | Same `practice_goal` | peer score | “Also interview prep · LeetCode” |
| **Consistent** (P6) | Active ≥ 8 of last 12 weeks; size 0.5–3× viewer | active weeks, then peer score | “Active 11 of 12 weeks · ~4/week” |
| **Active this week** | ≥ 1 solve this ISO week | shared-topic overlap with viewer, **then** solves (no rank shown) | “+6 this week · Graphs” |
| **Topic specialists** (P3, hub) | Public topic T with ≥ 15 problems and ≥ 60% owner completion | `completion · log(size)` | “60 Graphs problems · 80% solved” |
| **Public lists** (M1, hub) | Public topics named T (`normalized_name`) with ≥ 5 problems | `2·log(1+copies30d) + log(1+size) + 0.5·completion + 0.5·hasDescription`; max 1 list per owner in top 10 | “Copied 41× · 60 problems · easy → hard” |
| **Commonly tracked** (M2) | Problems (by `normalized_url`) in public topics T of ≥ 3 distinct owners | owner count, then median difficulty ascending | “In 9 lists” |
| **Topic pattern** (M3) | Users with visibility `topics` who have T; k ≥ 10 | co-occurrence %, top 5 | — |
| **Goal pattern** (M4) | Users with goal G and visibility `topics`; k ≥ 10 | topic presence %, top 6 + platform share | — |
| **Peer group** (M5) | Top 30 peers by peer score | medians; shown when ≥ 5 | — |

Definitions: `topicJaccard` over `normalized_name` sets (requires candidate visibility `topics`, else 0); `platformSim = 1 − ½·L1(platformShare)`; `sizeSim = min(a,b)/max(a,b)` of total problems; `recentActivityOverlap` = both active in ≥ 2 of last 4 weeks.

### 2.8 Cold start, onboarding, and seeded content

**Starter lists.** A house account with handle `@starter` (display name “Practice starter lists”; not user-registerable) publishes curated public topics: Arrays & Hashing, Two Pointers, Binary Search, Trees, Graphs, DP, Greedy, Monotonic Stack. These rank like any list but carry a “Starter” badge, and they fill topic hubs and the For you fallback on day one. Content is our own selection of public judge links; no third-party list names are copied.

**First-visit onboarding (Discover).** A single dismissible sheet, three short steps, all skippable:

```text
┌ Discover how others practice ────────────────────────────────┐
│ 1  See people with similar topics and find great lists.      │
│    Your library stays private unless you share it.           │
│                                                              │
│ 2  What are you practicing for?  (optional)                  │
│    [Interview prep] [Contests] [Fundamentals] [Coaching]     │
│                                                              │
│ 3  Share your practice?                                      │
│    ( ) Not now   ( ) Summary   (•) Summary + topics          │
│                                                              │
│                         [ Skip ]   [ Start exploring ]       │
└──────────────────────────────────────────────────────────────┘
```

**Fallback ladder for Discover → For you** (top to bottom, first that has content wins for each slot; empty rails are hidden):

1. Rails with ≥ 3 cards.
2. Goal pattern card (if goal set and k ≥ 10).
3. “Explore your topics” chips (always available if viewer has topics).
4. Starter lists (always available).

**Dev seed.** `pnpm db:seed:discover-demo` (dev/test only) creates ~20 realistic discoverable users with varied goals, sizes, cadences, and public topics, so every journey can be walked locally and in integration tests.

---

## 3. Privacy model

### 3.1 Profile visibility (per user)

New column `users.practice_visibility`:

| Value | Label in UI | Who can find / view | What is visible |
| --- | --- | --- | --- |
| `private` (default) | **Only me** | Nobody | Nothing; handle lookups return 404 |
| `summary` | **Practice summary** | Signed-in users | Name, `@handle`, avatar, bio, goal, overall counts, streak, weekly activity, platform mix |
| `topics` | **Summary + topics** | Signed-in users | Everything in `summary` + topic names with solved/total/% |

Problem titles and links are **never** visible at profile level; only via public topics (3.2).

### 3.2 Topic sharing (per topic)

New columns `topics.is_public` (default `false`) and `topics.description` (optional, ≤ 280 chars, shown only when public). Effective only when profile visibility is `topics`.

A public topic exposes its **problem list**: title, platform, judge problem ID, difficulty, rating, owner’s solved/unsolved, and the problem URL (public judge links). It never exposes notes, `solvedAt`, `createdAt`, or other topics the problem belongs to unless those are public too.

### 3.3 Practice goal

New nullable column `users.practice_goal` (`interview` | `contests` | `fundamentals` | `coaching`). Visible from `summary`; used for Same goal rail and goal patterns.

### 3.4 Never exposed

Email, user id, notes, exact `solvedAt` / `createdAt` timestamps, private topics (names or problems), Google-link status, sessions, work/education entries, who viewed or copied anything.

### 3.5 Aggregates (k-anonymity)

Aggregates only draw from users whose visibility allows the underlying data (`topics` for topic/problem aggregates, `summary` for activity), and are shown only above thresholds: **k ≥ 3** owners for problem counts and topic hints, **k ≥ 5** peers for benchmarks, **k ≥ 10** users for pattern percentages. Below threshold, the block is hidden (not shown as “0”).

### 3.6 Turning it off

Switching to `private` hides the user from search, rails, aggregates, follow lists, and profile URLs **immediately** (aggregate caches ≤ 5 minutes). Making a topic private removes it from hubs and counts the same way. Account deletion cascades follows and counters.

### 3.7 Auth scope

D1–D7: all discovery endpoints require a signed-in user (`AuthSecurityGuard` + `AccessGuard`), which limits scraping and keeps rate limits per account. Anonymous public pages are an explicit, separate opt-in in D8.

---

## 4. Information architecture and placement

### 4.1 Navigation

Add a fifth sidebar item **Discover** between **Topics** and **Profile** in [`AppSidebar.tsx`](../../solve-tracker-frontend/src/components/app/AppSidebar.tsx):

```text
Dashboard
Library
Topics
Discover      ← new (compass icon)
Profile
```

Inside Discover, a sub-nav splits **who** and **what**:

```text
Discover   [ For you ]  [ People ]  [ Topics ]          [ 🔍 Search people… ]
```

- **For you** — personal rails and patterns (default).
- **People** — “See all” destination with rail selector and filters (goal, platform, topic, active).
- **Topics** — topic directory: your topics first, then popular topics with public lists.

[`nav-active.ts`](../../solve-tracker-frontend/src/lib/app/nav-active.ts) gains section `"discover"`, active for `/app/discover*` **and** `/app/u/*`.

### 4.2 Routes (frontend, file routes)

| Route | File | Purpose | Phase |
| --- | --- | --- | --- |
| `/app/discover` | `src/routes/app/discover.tsx` (layout: sub-nav + search) + `discover/index.tsx` | For you | D4 |
| `/app/discover/people` | `src/routes/app/discover/people.tsx` | See all people (`?rail=peers\|ahead\|goal\|consistent\|active`, filters) | D4 |
| `/app/discover/topics` | `src/routes/app/discover/topics/index.tsx` | Topic directory | D5 |
| `/app/discover/topics/:topicKey` | `src/routes/app/discover/topics/[topicKey].tsx` | Topic hub (`topicKey` = URL-encoded `normalized_name`) | D5 |
| `/app/u/:handle` | `src/routes/app/u/[handle].tsx` | Practice profile | D3 |
| `/app/u/:handle/topics/:topicId` | `src/routes/app/u/[handle]/topics/[topicId].tsx` | Public topic | D3 |
| `/app/u/:handle/compare` | `src/routes/app/u/[handle]/compare.tsx` | Them vs me (`?focus=cadence\|topics`) | D6 |
| `/app/profile` (existing) | `src/routes/app/profile.tsx` | Practice visibility panel + goal + View as others | D1 |
| `/u/:handle` (public) | `src/routes/u/[handle].tsx` | Anonymous share page | D8 |

The `layout + index` and `[id]` + `[id]/child` patterns already exist (`app/problems.tsx`, `problems/[id]/edit.tsx`). Handles live under `/u/`, so they cannot collide with routes; still reserve `discover` and `u` as handles for future top-level routes.

### 4.3 Content placement map

What appears where, in what order. Order rule: **most personal first, generic last**; at most three rails above the fold.

| Surface | Blocks (top → bottom) | Phase |
| --- | --- | --- |
| **Discover / For you** | Opt-in nudge (if private) · Peers rail · A step ahead rail · Goal pattern card (if goal) · Same goal rail (moves to top when goal set) · Explore your topics chips · Consistent rail · Active this week (5 rows) · Starter lists | D4 (+ goal pattern D5) |
| **Discover / People** | Rail selector · filters · person rows (paginated 20) | D4 |
| **Discover / Topics** | Your topics (with “N people · M lists”) · Popular topics grid · Starter topics | D5 |
| **Topic hub** | Header (name, practicers, lists, your status) · Public lists (top 6, See all) · Commonly tracked problems (10) · Pattern card · Topic specialists rail · Starter list (if any) | D5 |
| **Practice profile** | Header · Stats strip · Activity · Platform mix + Topic board · Public lists of this person · Similar practicers rail | D3 (+ similar rail D4) |
| **Public topic page** | Header (topic, owner, description, completion, copies) · Copy topic · Problem table · More lists for this topic | D3 (+ actions D6, more lists D5) |
| **Compare** | Summary table · Platform shares · Topic focus · Insights · “vs peers” toggle | D6 |
| **Dashboard** (existing) | Existing blocks · **How you compare** benchmark card (under stats) · **People like you** card (under topic progress) | D4 (people) / D6 (benchmark) |
| **Topics page** (existing) | Per row: Public toggle + share stats (owner) · “N people · M lists → Explore” hint · created-topic success hint | D1 (toggle) / D5 (hints) / D6 (stats) |
| **Library** (existing) | When filtered to exactly one topic: collapsible **Ideas from the community** under results | D5 |
| **Problem detail** (existing) | **In the community** panel below metadata | D5 |
| **Own profile** (existing) | Practice visibility panel (visibility, goal, never-shared line, View as others, Copy link, share stats) | D1 (+ stats D6) |

### 4.4 Backend modules

| Module | Path | Responsibility |
| --- | --- | --- |
| `profile` (existing) | `src/modules/profile/` | `practiceVisibility`, `practiceGoal` |
| `topics` (existing) | `src/modules/topics/` | `isPublic`, `description`, owner share stats |
| `discover` (new) | `src/modules/discover/` | One module, two controllers: `people.controller.ts` (someone’s practice by handle: summary, activity, topics, public topic problems, similar, compare) and `discover.controller.ts` (search, rails, topic directory, hubs, commonly tracked, patterns, benchmarks, community panel, events) |
| `discover/visibility` (new) | `src/modules/discover/visibility.ts` | **Single** projection + eligibility functions used by every people/discover query |
| `follows` (new, D7) | `src/modules/follows/` | Follow / unfollow / following |
| `progress` (existing) | `src/modules/progress/` | Services accept a target `userId` so `people` reuses the same SQL |

---

## 5. Screen design

All layouts reuse existing tokens/components (`AppPageContainer`, panel classes, `PlatformMark`, `Button`, `FormAlert`, `LoadingPlaceholder`) and dashboard components where noted. Desktop first, mobile notes per screen.

### 5.1 Profile → Practice visibility panel (D1)

Placed on `/app/profile` after About, using `ProfileSectionShell`.

```text
┌ Practice visibility ───────────────────────────────────────────────┐
│ Choose what other signed-in users can see about your practice.     │
│                                                                    │
│ ( ) Only me              Nobody can find or view your practice.    │
│ ( ) Practice summary     Counts, streak, weekly activity, platforms│
│ (•) Summary + topics     Also topic names and progress. Share      │
│                          problem lists per topic on Topics.        │
│                                                                    │
│ Practicing for (optional)  [ Interview prep ▾ ]                    │
│                                                                    │
│ Never shared: email, notes, exact solve times, private topics,     │
│ and who viewed you.                                                │
│                                                                    │
│ This month: profile viewed 18× · your lists copied 4× (D6)         │
│ [ View as others → ]  [ Copy link ]                   [ Save ]     │
└────────────────────────────────────────────────────────────────────┘
```

- Radio group (`fieldset` + `legend`), not a toggle.
- “Never shared” line always visible — the trust anchor.
- View as others / Copy link disabled while `private`, with hint.
- System-assigned handle (`user-7f3a`) → hint “People will see you as @user-7f3a. Choose a handle” → `ProfileHandleEditorDialog`.

### 5.2 Topics page — sharing and hints (D1, D5, D6)

```text
Graphs        48 / 60   🌐 Public ▾   Viewed 23× · copied 4×      34 people · 12 lists → Explore
DP            31 / 52   🔒 Private ▾                                58 people · 20 lists → Explore
My weird mix   3 / 4    🔒 Private ▾                                (no hint: below k)
```

- Toggle shows icon + text; opening it reveals **Description** (≤ 280 chars) and **View as others**.
- When visibility < `topics`: one banner “Topic sharing is off” with **Share topics** button; toggles disabled.
- Community hint uses `normalized_name`; hidden below k = 3.
- After creating a topic, the success state shows the hint immediately (J2 trigger).

### 5.3 Practice profile `/app/u/:handle` (D3)

```text
┌───────────────────────────────────────────────────────────────────────┐
│ (avatar)  Ayesha Rahman  @ayesha            [Interview prep]          │
│           “Grinding graphs for ICPC regionals.”                       │
│           Practicing since Mar 2026 · 🔥 9-day streak                 │
│                                [ Compare with me ]  [ Follow ] (D7)   │
├───────────────────────────────────────────────────────────────────────┤
│  Solved 214   Unsolved 37   Total 251   This week +11 solved          │
├───────────────────────────────────────────────────────────────────────┤
│  Activity (12 weeks)  ▂▃▅▅▇▆▃▅▆▇▇█                                     │
├──────────────────────────────┬────────────────────────────────────────┤
│ Platform mix                 │ Topics                                 │
│  Codeforces   58%  ███████   │  Graphs          48/60  80%  🌐 Public │
│  LeetCode     31%  ████      │  DP              31/52  60%  🌐 Public │
│  CodeChef      8%  █         │  Greedy          22/25  88%            │
├──────────────────────────────┴────────────────────────────────────────┤
│ Public lists                                                          │
│  [Graphs · 60 · copied 41×]  [DP · 52 · copied 12×]                   │
├───────────────────────────────────────────────────────────────────────┤
│ Similar practicers (D4)   (card)(card)(card)(card)                    │
└───────────────────────────────────────────────────────────────────────┘
```

- Dashboard components reused with `readOnly` / `hrefFor` so nothing links into the viewer’s library.
- Viewing yourself: banner “This is how others see you” + Edit visibility.
- Unknown or private: one shared “This practice profile isn’t available” state.
- `<Title>` “@ayesha · Practice”; `noindex` until D8.
- Mobile: header stacks; platform mix and topics become sequential sections; rails scroll horizontally.

### 5.4 Public topic `/app/u/:handle/topics/:topicId` (D3, actions D6)

```text
← @ayesha · Graphs                                   48 / 60 solved by owner
“Easy → hard. Do BFS before Dijkstra.”                 Copied 41× this month
Difficulty  ▁▃▅▇▅▂  (easy → hard)
[ Copy topic to my library ] (D6)

Title                          Platform     Difficulty  Owner      You
Shortest Path in Grid          LeetCode     Medium      ✓ Solved   [ + Add ]
Dijkstra?                      Codeforces   1900        ○          ✓ In library
...                                                       (paginated, 50/page)

More Graphs lists (D5)   (list card)(list card)(list card)
```

- **You** column (D6) tells the viewer immediately what they already have: + Add → Added ✓ → link; “In library” uses `normalized_url` match.
- Copy topic result toast: “Added 18 · 4 already in your library · into your topic Graphs” with **Open**.
- Filters: owner status and platform; no search in v1.

### 5.5 Discover / For you `/app/discover` (D4)

```text
Discover   [ For you ] [ People ] [ Topics ]                [ 🔍 Search people… ]

┌ You’re browsing privately. Share your practice so people like you  [Share] ┐   (only if private)

People like you                                                     See all →
(card)(card)(card)(card)
 Each card: avatar · @handle · [goal] · 214 solved · 🔥9
            “Shares Graphs, DP · LeetCode · ~5/week”        [ View ] [ Compare ]

A step ahead                                                        See all →
(card)(card)(card)(card)   “Solved 3× more in your shared topics”

What interview preppers practice                                (goal pattern, D5)
 Arrays 90% ✓  Trees 75%  DP 70% ✓  Graphs 60%  Heaps 45%   · mostly LeetCode
 [ Explore Trees ]

Explore your topics
 [Graphs · 12 lists] [DP · 20 lists] [Greedy · 6 lists] [Binary Search · 9 lists]

Consistent practicers                                               See all →
(card)(card)(card)(card)   “Active 11 of 12 weeks · ~4/week”

Active this week                                                    See all →
 (av) @rafi   +6 this week · Graphs, Trees                                 [View]
 ...

Starter lists by @starter
 [Arrays & Hashing · 25] [Two Pointers · 15] [Graphs · 30] …
```

- Rails with < 3 cards hidden (§2.8 fallback ladder).
- Cards always have the reason line; **Compare** shortcut on cards (D6).
- Search: debounce 250 ms, min 2 chars, up to 10 inline results (combobox, `aria-activedescendant`), Enter opens first.
- Empty search: “No practice profile with that handle” (same text for private).
- Mobile: search collapses to an icon in the sub-nav; rails scroll horizontally with snap; pattern card full width.

### 5.6 Discover / Topics and topic hub (D5)

**Directory** `/app/discover/topics`:

```text
Your topics
 [Graphs · 34 people · 12 lists] [DP · 58 · 20] [Greedy · 19 · 6] …
Popular topics
 [Arrays] [Strings] [Trees] [Binary Search] [Heaps] [Bit manipulation] …
```

**Hub** `/app/discover/topics/graphs`:

```text
Graphs                                         34 practicers · 12 public lists
You: 12 / 30 solved in your Graphs topic                     [ Open in library ]

Public lists                                                  See all 12 →
 ┌──────────────────────────┐ ┌──────────────────────────┐ ┌───────────────────┐
 │ Graphs · @ayesha          │ │ Graph basics · @starter │ │ Graphs · @mina    │
 │ 60 problems · 80% solved  │ │ 30 problems · Starter    │ │ 45 · 60% solved   │
 │ ▁▃▅▇▅▂  copied 41×        │ │ ▃▅▅▃▁  copied 30×        │ │ ▂▄▆▅▃ copied 9×   │
 │ “Easy → hard…”            │ │                          │ │                   │
 │ [ Open ] [ Copy ]         │ │ [ Open ] [ Copy ]        │ │ [ Open ] [ Copy ] │
 └──────────────────────────┘ └──────────────────────────┘ └───────────────────┘

Commonly tracked Graphs problems
 Number of Islands      LeetCode   Medium   in 14 lists   ✓ In library
 Course Schedule        LeetCode   Medium   in 11 lists   [ + Add ]
 ...

People who practice Graphs also practice
 BFS 68%  Trees 54% ✓  DP 40% ✓  Union-Find 31%   [ Explore BFS ]

Topic specialists
 (card)(card)(card)   “60 Graphs problems · 80% solved”
```

- Header always shows the viewer’s own state for this topic, linking back to the library filter — discovery ends in the viewer’s library.
- Problem “+ Add” pre-tags with the viewer’s topic of the same `normalized_name` (creates it if missing, with confirmation text “Adds to your topic Graphs”).
- Hub for a topic with nothing public: header + pattern card (if k) + starter list (if any) + “Be the first to share a Graphs list” (links to Topics page share toggle).

### 5.7 Contextual panels (D5)

**Library — Ideas from the community** (library filtered to exactly one topic, below results):

```text
▸ Ideas from the community (6) — commonly tracked DP problems you don’t have
  Coin Change            LeetCode   Medium   in 9 lists    [ + Add ]
  Longest Inc. Subseq.   LeetCode   Medium   in 8 lists    [ + Add ]
  See DP hub →
```

**Problem detail — In the community**:

```text
In the community
In 7 public lists · Graphs, BFS
 [Graphs · @ayesha · 60]  [BFS drills · @rafi · 22]          See Graphs hub →
```

Both hidden below k = 3; both collapsible; neither loads until scrolled into view (lazy request).

### 5.8 Dashboard cards (D4, D6)

```text
How you compare (people like you)                           Compare →
 Active weeks     You 4/12   ·  peers 8/12
 Solved / week    You 1.8    ·  peers 4.5
 Top topic share  You 70% Arrays  ·  peers 35%
 → Your practice is concentrated on Arrays. See what people like you practice next.

People like you                                             See all →
 (av)(av)(av)  @mina, @rafi and 4 others share your top topics.
```

- Benchmark shown only with ≥ 5 peers; otherwise replaced by a starter-lists nudge.
- One insight line max on the dashboard; full list on compare.
- Private users still see benchmarks (they read aggregates of others; their own data is not shown to anyone).

### 5.9 Compare `/app/u/:handle/compare` (D6)

```text
You vs @ayesha        [ vs @ayesha | vs people like you ]        [ Last 12 weeks ▾ ]

                         You          @ayesha
Solved                   62           214
Solved / week (avg)      3.1          9.4
Active weeks             7 / 12       12 / 12
Current streak           2 days       9 days

Platform mix
  Codeforces             12% ██       58% ████████
  LeetCode               80% ████████ 31% ████

Topic focus (share of all problems)              Completion
  Graphs                  5% █        24% ████    40% vs 80%
  DP                     30% ████     21% ███     55% vs 60%

Insights
• @ayesha practices every week; you were active 7 of 12 weeks.
• Graphs is 24% of their practice and 5% of yours.        [ Open their Graphs list ]
• They practice Monotonic Stack — you don’t have it.       [ Copy topic ]
```

- Viewer on the **left** in brand colour; other side neutral.
- Shares and percentages for topic/platform rows; absolute numbers only in the top table.
- `?focus=cadence` (from Consistent rail) puts cadence rows first; `?focus=topics` (from topic contexts) puts topic focus first.
- “vs people like you” swaps the right column for peer medians (same layout).
- Insights: rule-based, max 4, each with an action when possible; neutral copy.
- If the other person is `summary` only, topic rows show “@ayesha shares only a summary”.

### 5.10 Cross-cutting UX

- **Loading:** skeletons matching final layout; rails load independently.
- **Errors:** per-section `FormAlert` with Retry; one failing rail never blanks the page.
- **Accessibility:** charts have a “Show as table” alternative; bars carry numeric labels; rails are lists with headings; horizontal scrollers keyboard-scrollable; focus to page heading on route change.
- **Performance:** For you loads rails in parallel; aggregates cached 5 minutes per viewer (rails) or per topic (hubs); contextual panels lazy-load on visibility.
- **Copy deck:** “practice profile”, “share”, “public list”, “people like you”, “a step ahead”, “commonly tracked”. Never “rank”, “top”, “better”, “beat”.

---

## 6. API design

All under the authenticated product client; OpenAPI-generated types; Zod `strictObject`. Handles matched case-insensitively. Every endpoint goes through `discover/visibility.ts`.

### 6.1 Owner settings (D1, D6)

| Method | Path | Change |
| --- | --- | --- |
| `GET`/`PATCH` | `/users/me/profile` | Add `practiceVisibility`, `practiceGoal` |
| `GET` | `/topics`, `PATCH /topics/:id` | Add `isPublic`, `description` |
| `GET` | `/users/me/share-stats?days=30` (D6) | `{ profileViews, topics: [{ topicId, views, copies }] }` |

### 6.2 People (D2–D4)

| Method | Path | Returns | Visibility |
| --- | --- | --- | --- |
| `GET` | `/people/:handle` | Header + overall + streak + platforms + goal | `summary`+ |
| `GET` | `/people/:handle/activity?weeks=` | Same shape as `GET /progress/activity` | `summary`+ |
| `GET` | `/people/:handle/topics` | Topic board rows (`id` only for public topics) | `topics` |
| `GET` | `/people/:handle/topics/:topicId` | List header (description, completion, copies30d, difficulty histogram) | public topic |
| `GET` | `/people/:handle/topics/:topicId/problems?page=&status=&platform=` | Public problem rows + `inViewerLibrary` | public topic |
| `GET` | `/people/:handle/similar?limit=` (D4) | Person cards | `summary`+ |

Private, unknown, or blocked → **404** `PROFILE_NOT_FOUND`, identical body.

### 6.3 Discover (D4–D6)

| Method | Path | Notes | Phase |
| --- | --- | --- | --- |
| `GET` | `/discover/search?q=&limit=` | ≥ 2 chars; handle prefix + name match; ≤ 10 | D4 |
| `GET` | `/discover/for-you` | `{ rails: [{ kind, people[] }], goalPattern?, yourTopics[], starterLists[] }` — rails pre-filtered by §2.8 | D4 (+D5 fields) |
| `GET` | `/discover/people?rail=&goal=&platform=&topic=&page=` | Paginated person rows | D4 |
| `GET` | `/discover/topics` | Your topics with counts + popular topics (k-filtered) | D5 |
| `GET` | `/discover/topics/:topicKey` | Hub header, lists (top 6), pattern, specialists, viewer state | D5 |
| `GET` | `/discover/topics/:topicKey/lists?page=` | All lists for a topic | D5 |
| `GET` | `/discover/topics/:topicKey/problems?excludeMine=` | Commonly tracked (k ≥ 3) | D5 |
| `GET` | `/discover/topic-hints` | Hints for the viewer’s topics (Topics page) | D5 |
| `GET` | `/discover/problems/:problemId/community` | Community panel for viewer’s own problem (by its `normalized_url`) | D5 |
| `GET` | `/discover/benchmark` | Viewer vs peer medians + one insight | D6 |

Person card DTO: `{ handle, name, avatarUrl, goal, solved, streakDays, platforms: slug[], reason: { kind, text, sharedTopics? } }`.

### 6.4 Compare and borrow (D6)

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/people/:handle/compare?weeks=12` | `{ me, them, topics, insights }` |
| `GET` | `/discover/compare-peers?weeks=12` | Same shape, `them` = peer medians |
| `POST` | `/people/:handle/topics/:topicId/copy` | Merge into viewer topic with same `normalized_name` (create if missing); link duplicates by URL; returns `{ topicId, added, linked }`; increments copy counter |
| `POST` | `/problems` (existing) | “+ Add” uses current create + 409 duplicate flow, with `topicIds` pre-filled |

### 6.5 Follows (D7)

`PUT`/`DELETE /people/:handle/follow`, `GET /users/me/following`, `GET /users/me/followers/count`; table `user_follows (follower_id, followee_id, created_at)`.

### 6.6 Rate limits and abuse

- Search 30/min; for-you, people, hubs 30/min; profile and list reads 120/min; copy 20/min per user.
- Counters record **no viewer identity** (§7).
- Block/report: prerequisite for D8.

---

## 7. Data model changes

| Change | Phase | Notes |
| --- | --- | --- |
| `users.practice_visibility text not null default 'private'` + check | D1 | Every existing user stays private |
| `users.practice_goal text null` + check | D1 | Optional |
| `topics.is_public boolean not null default false` | D1 | — |
| `topics.description text not null default ''` (≤ 280) | D1 | Shown only when public |
| Partial index `users (id) where practice_visibility <> 'private'` | D4 | Rail candidate scans |
| Index `topics (normalized_name) where is_public` | D5 | Hubs, lists, hints |
| Index `problems (normalized_url)` | D5 | Commonly tracked, community panel, `inViewerLibrary` |
| `discover_daily_counters (subject_type, subject_id, day, views, copies)` PK (type, id, day) | D2 (views) / D6 (copies) | Anonymous; cascade on subject delete; 13-month retention |
| `discover_events (viewer_id, event, surface, created_at)` | D4 | Funnel analytics only (no subject ids); written via `POST /discover/events`; 90-day retention |
| House account `@starter` + starter topics | D4 (via `db:seed`) | Idempotent seed, prod-safe |
| `user_follows` | D7 | Cascade on both FKs |

No new personal data is collected beyond the optional goal and topic description; discovery re-projects existing problems/topics/progress.

---

## 8. Frontend structure

```text
solve-tracker-frontend/src/
  routes/app/discover.tsx                       # layout: sub-nav + search
  routes/app/discover/index.tsx                 # For you
  routes/app/discover/people.tsx
  routes/app/discover/topics/index.tsx
  routes/app/discover/topics/[topicKey].tsx
  routes/app/u/[handle].tsx
  routes/app/u/[handle]/compare.tsx
  routes/app/u/[handle]/topics/[topicId].tsx
  components/discover/
    DiscoverSubNav.tsx  DiscoverSearch.tsx  DiscoverOnboardingSheet.tsx
    DiscoverRail.tsx  DiscoverPersonCard.tsx  DiscoverPersonRow.tsx
    DiscoverReasonLine.tsx  DiscoverOptInBanner.tsx
    DiscoverPatternCard.tsx  DiscoverTopicChip.tsx  DiscoverListCard.tsx
    DiscoverCommonProblemRow.tsx  DiscoverTopicHubHeader.tsx
    DiscoverIdeasPanel.tsx  DiscoverCommunityPanel.tsx  DiscoverBenchmarkCard.tsx
  components/people/
    PeopleProfileHeader.tsx  PeopleTopicBoard.tsx  PeoplePublicProblemRow.tsx
    PeopleUnavailable.tsx  PeopleViewAsBanner.tsx  PeopleCopyTopicButton.tsx
  components/compare/
    CompareSummaryTable.tsx  CompareShareBars.tsx  CompareInsights.tsx
  components/profile/ProfilePracticeVisibilityPanel.tsx
  components/topics/TopicShareControl.tsx  TopicCommunityHint.tsx
  lib/api/modules/people.api.ts  discover.api.ts
  lib/discover/                                 # paths, topicKey encode, add/copy state reducers, copy deck
```

Dashboard components reused read-only via a `readOnly` / `hrefFor` prop: `DashboardStatsStrip`, `DashboardActivityChart`, `DashboardPlatformGrid`, `DashboardStreakBadge`, `DashboardTopicProgressList`.

Feature flag: backend `DISCOVER_MODE=off|sharing|full` (env, default `off`) and frontend `VITE_DISCOVER_MODE`. `sharing` exposes owner controls and self preview only; `full` enables discovery. Everything else ships dark until the launch bar (§10) passes. Execution order: [PRACTICE_DISCOVERY_EXECUTION_PLAN.md](PRACTICE_DISCOVERY_EXECUTION_PLAN.md).

---

## 9. Phased execution plan

Each phase is shippable behind the flag and ends with a verify script (`TEST_DATABASE_URL` ending in `_test`), matching existing `verify:*` conventions. Journeys in brackets are the ones that become walkable at the end of the phase.

### D0 — Decisions, requirements, journeys (docs only)

1. Amend [REQUIREMENTS.md](../REQUIREMENTS.md): §3 (private by default, opt-in sharing), new **FR-10 Practice discovery** (privacy model §3, journeys §2.4 as acceptance), move “Sharing” from §9 to in-scope, keep leaderboards/feeds in §10.
2. Sign off: visibility levels, goal values, k thresholds, ranking rules (§2.7), copy deck (§5.10), starter list contents.
3. Decide reserved handles `discover`, `u`.

**Exit:** decisions approved; REQUIREMENTS amended.

### D1 — Owner controls (nothing exposed yet)

1. Migration: `practice_visibility`, `practice_goal`, `topics.is_public`, `topics.description`.
2. APIs: profile and topics fields; reserved handles (+ spec update).
3. UI: Practice visibility panel; Topics page share control with description; system-handle hint.
4. `DISCOVER_MODE` / `VITE_DISCOVER_MODE` flags (`off` | `sharing` | `full`).
5. `db:seed:discover-demo` (dev/test).

**Exit:** owners can configure sharing; no endpoint reads another user; defaults verified. Gate: `pnpm verify:discover-d1`.

### D2 — People read API + visibility core

1. `discover/visibility.ts`: eligibility + projection used by all later queries.
2. Progress services accept target `userId`.
3. `people` endpoints (§6.2 except similar); view counters.
4. Integration tests per visibility level; key-set assertions (no notes, timestamps, email, ids); uniform 404.

**Exit:** API exposes exactly §3 per level. Gate: `pnpm verify:discover-d2`.

### D3 — Profile and public topic pages [J4 partially, J8 preview]

1. Routes `/app/u/[handle]`, `/app/u/[handle]/topics/[topicId]`.
2. People components; dashboard components gain read-only mode.
3. View as others + Copy link from visibility panel and Topics page.

**Exit:** profiles and lists render for each level; component tests incl. unavailable state; `pnpm check` green.

### D4 — Discover: people [J1 people part, J4, J6 rail]

1. `discover` module: search, for-you (Peers, A step ahead, Same goal, Consistent, Active), people list, similar; partial index; events table.
2. House account `@starter` + starter lists seed (prod-safe, idempotent).
3. UI: Discover layout + sub-nav + search, For you with fallback ladder, People page, onboarding sheet, opt-in banner, similar rail on profiles.
4. Sidebar item + `nav-active`; dashboard **People like you** card.

**Exit:** with demo seed every rail populates with correct reasons; private users never appear; rails below 3 hidden. Gate: `pnpm verify:discover-d4`.

### D5 — Discover: topics and material [J2, J3, J5, J7]

1. Topic directory, hubs, lists ranking, commonly tracked, topic/goal patterns, topic hints, community panel; indexes; k-thresholds.
2. UI: Topics tab + hub; Topics page hints + created-topic hint; library **Ideas from the community**; problem detail **In the community**; “More lists” on public topic page; goal pattern card on For you.

**Exit:** aggregates respect k (tests at k−1 and k); hub never empty with starter lists present; contextual panels lazy-load. Gate: `pnpm verify:discover-d5`.

### D6 — Compare, borrow, benchmarks, sharer feedback [J1 complete, J6 complete, J8 complete]

1. Compare (person and peers) with insights; `?focus`.
2. Copy topic (merge by `normalized_name`, link duplicates) and **You** column / + Add states; copy counters.
3. Dashboard **How you compare** card; share stats on Topics page and visibility panel.

**Exit:** compare numbers equal each side’s own `/progress`; copy idempotent; insights never reference private topics; counters anonymous. Gate: `pnpm verify:discover-d6`.

### Launch gate — enable the flag in production

Run the launch quality bar (§10). Only then announce.

### D7 — Follow (optional)

`user_follows`, follow button, Following tab on Discover People, follower count in visibility panel. Gate: `pnpm verify:discover-d7`.

### D8 — Public share pages (optional, separate opt-in)

`public_web` opt-in, anonymous `/u/:handle` SSR with OG card, `noindex` by default, block/report, IP rate limits, security review.

---

## 10. Launch quality bar (anti “feature drop”)

The flag is turned on in production only when **all** of these pass on a staging database seeded with `db:seed:discover-demo` plus starter lists:

| # | Check | How |
| --- | --- | --- |
| 1 | Journeys **J1–J8** can be walked end to end, each ending in an action in the viewer’s library | Scripted walkthrough (manual + Playwright for J1, J2, J3) |
| 2 | Every discovery page has ≥ 1 contextual entry point besides the sidebar | Placement map §4.3 review |
| 3 | No rail, panel, or hub ever renders empty; every block has defined loading / error / below-k states | Component tests + seed with 0, k−1, k users |
| 4 | Every person and list carries a reason line | Snapshot tests |
| 5 | Privacy: key-set tests for every endpoint; private user absent from every surface; k thresholds enforced | `verify:discover-d2…d6` |
| 6 | Onboarding sheet and opt-in nudges work for private and sharing users | Manual + component tests |
| 7 | Copy deck review: no “rank / top / beat / better” | grep + review |
| 8 | Accessibility: keyboard paths through rails, combobox, compare; chart table alternatives | axe + manual |
| 9 | Mobile layouts for For you, hub, profile, compare | Manual at 375 px |
| 10 | Funnel events recorded for each journey’s start and end action | `discover_events` check |

**After launch:** review metrics (§13) at 2 and 6 weeks. Any rail with click-through < 2% or any journey with < 10% completion gets a fix or is removed — features are not left to rot.

---

## 11. Rollout order

| Order | Phase | Depends on | User-visible? |
| --- | --- | --- | --- |
| 1 | D0 Decisions | — | No |
| 2 | D1 Owner controls | D0 | Settings only (flag off: hidden) |
| 3 | D2 People API | D1 | No |
| 4 | D3 Profile pages | D2 | Flagged |
| 5 | D4 Discover people | D3 | Flagged |
| 6 | D5 Topics and material | D4 | Flagged |
| 7 | D6 Compare and borrow | D5 | Flagged |
| 8 | **Launch gate** (§10) | D6 | **Public launch** |
| 9 | D7 Follow | Launch | Yes (optional) |
| 10 | D8 Public web | Launch + security review | Yes (optional) |

Owner controls (D1) can be enabled before launch so early users start sharing and the supply side exists on day one; announce them as “Share your practice — coming soon to Discover”.

---

## 12. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Cold start: nobody shares | Starter lists, owner controls before launch, onboarding step 3, sharer feedback loop |
| Feature drop: shipped but unused | Journeys as acceptance, contextual hooks, launch bar, 2/6-week review with remove-or-fix rule |
| Comparison discourages beginners | “A step ahead” capped at 4×; percentages; neutral copy; no ranks; actions in every insight |
| Accidental oversharing | Private default, explicit radio descriptions, never-shared line, View as others |
| Inference from aggregates | Only shared data feeds aggregates; k ≥ 3 / 5 / 10 thresholds; hide below k |
| Handle enumeration / scraping | Signed-in only, uniform 404, rate limits, min query length |
| Topic name mismatch (“DP” vs “Dynamic Programming”) | v1 exact `normalized_name`; measure misses; aliases later |
| Query cost | Partial indexes, 5-minute caches, materialize when discoverable users > ~5k |
| Low-quality lists ranking high | Size ≥ 5, description bonus, copies-based ranking, one list per owner in top 10 |

---

## 13. Success metrics (per journey)

| Journey | Metric | Target (6 weeks post-launch) |
| --- | --- | --- |
| Supply | % active users with visibility ≠ `private`; # public topics | ≥ 25%; ≥ 1 public topic per 4 sharing users |
| J1 | Benchmark card → compare → copy/add rate | ≥ 10% of card viewers act |
| J2 | Topic hub visits from Topics page hints; copies from hubs | ≥ 20% of new topics lead to a hub visit |
| J3 | Problems added from Ideas panel / commonly tracked | weekly growth |
| J4 | Search success (result opened) | ≥ 60% of searches |
| J5 | Users with goal set; goal pattern chip clicks | ≥ 40% of onboarding completers set a goal |
| J6 | Visits from Consistent rail; change in active weeks after 4 weeks | positive delta vs non-visitors |
| J7 | Community panel → list open rate | ≥ 5% of panel impressions |
| J8 | Owners whose lists got ≥ 1 copy; repeat sharing | ≥ 30% of sharers |
| Safety | Exposure incidents (notes/email/private data) | 0 |

---

## 14. Open questions

1. Should `summary` include a “top 3 topics” teaser without progress? (Leaning no.)
2. Default compare window 12 weeks or all time? (Leaning 12 weeks, switchable.)
3. Topic aliases before D5, or measure misses first? (Leaning measure first.)
4. Same-institution discovery from education entries — separate opt-in after D6? (Leaning yes, later.)
5. Should profile view counts be shown to owners at all, or only list copies? (Leaning copies + list views only; profile views optional.)
6. Starter lists: who curates and how often are they refreshed?

---

**Next action:** execute **E1** ([PRACTICE_DISCOVERY_EXECUTION_PLAN.md](PRACTICE_DISCOVERY_EXECUTION_PLAN.md)) — owner controls and feature flag.
