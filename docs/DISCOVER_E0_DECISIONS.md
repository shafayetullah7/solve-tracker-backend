# DISCOVER E0 — Design lock (results)

**Status:** complete (2026-11-18).  
**Plan:** [PRACTICE_DISCOVERY_PHASED_PLAN.md](PRACTICE_DISCOVERY_PHASED_PLAN.md) § D0; execution [PRACTICE_DISCOVERY_EXECUTION_PLAN.md](PRACTICE_DISCOVERY_EXECUTION_PLAN.md) E0.  
**Requirements:** [REQUIREMENTS.md](../REQUIREMENTS.md) **FR-10**.

## Locked decisions

### Practice visibility (`users.practice_visibility`)

| DB value | UI label | UI helper |
| --- | --- | --- |
| `private` | Only me | Nobody can find or view your practice. |
| `summary` | Practice summary | Counts, streak, weekly activity, and platform mix. |
| `topics` | Summary + topics | Also topic names and progress. Share problem lists per topic on Topics. |

Default: `private`.

### Practice goal (`users.practice_goal`, nullable)

| DB value | UI label |
| --- | --- |
| `interview` | Interview prep |
| `contests` | Contests |
| `fundamentals` | Fundamentals |
| `coaching` | Coaching |
| `NULL` | Not set |

### Topic sharing (`topics.is_public`, `topics.description`)

- `is_public` default `false`; effective only when owner visibility is `topics`.
- `description`: trimmed, ≤ 280 Unicode code points; shown only when public.

### Privacy and eligibility

**Never expose:** email, user id, notes, exact `solvedAt` / `createdAt`, private topic names on profile surfaces, Google-link status, sessions, work/education entries, viewer identity on view/copy counters.

**Lookup:** private, unknown, and (D7) blocked handles return identical **404** `PROFILE_NOT_FOUND`.

**Viewing:** signed-in users only (D1–D7); anonymous pages are D8 with separate opt-in.

**Discovery candidacy:** exclude viewer; visibility ≠ `private`; total problems ≥ **5**; (D7) not blocked.

### k-anonymity thresholds

| k | Surfaces |
| --- | --- |
| 3 | Topic hints, commonly tracked, community panel, problem-in-lists aggregates |
| 5 | Peer benchmark card, compare “vs people like you” |
| 10 | Topic pattern %, goal pattern % |

Below k: hide the block (no “0 people”).

### Ranking and rails

Caps: **8** cards per rail; **10** public lists per hub page (max **1** list per owner in top 10); deterministic tie-break by `handle` ascending.

| Rail / list | Candidates | Score / order | Reason kind |
| --- | --- | --- | --- |
| Peers | ≥1 shared `normalized_name` or platform sim ≥ 0.8 | `0.5·topicJaccard + 0.2·platformSim + 0.2·sizeSim + 0.1·recentActivityOverlap` | `shared_topics_platforms_cadence` |
| A step ahead | Shared topic; solved in shared topics 1.5–4× viewer (viewer &lt; 10 → band +10…60); active in last 4 weeks | shared overlap, then recency | `ahead_in_shared_topics` |
| Same goal | Same `practice_goal` | peer score | `same_goal` |
| Consistent | Active ≥ 8 of last 12 weeks; size 0.5–3× viewer | active weeks, then peer score | `consistent_cadence` |
| Active this week | ≥1 solve this ISO week | shared-topic overlap, then solves (no rank UI) | `active_this_week` |
| Topic specialists | Public topic T, ≥15 problems, ≥60% owner completion | `completion · log(size)` | `topic_specialist` |
| Public lists | Public T, ≥5 problems | `2·log(1+copies30d) + log(1+size) + 0.5·completion + 0.5·hasDescription` | `list_card` |
| Commonly tracked | `normalized_url` in ≥3 owners’ public T | owner count, then difficulty | `in_n_lists` |
| Topic pattern | Visibility `topics`, have T; k≥10 | co-occurrence %, top 5 | — |
| Goal pattern | Goal G, visibility `topics`; k≥10 | topic presence %, top 6 | — |
| Peer group | Top 30 peers by peer score | medians when ≥5 peers | — |

Definitions: `topicJaccard` over `normalized_name` (candidate needs `topics` visibility else 0); `platformSim = 1 − ½·L1(shares)`; `sizeSim = min/max totals`; `recentActivityOverlap` = both active in ≥2 of last 4 weeks.

### Operational constants (`discover.config.ts` in E2+)

| Key | Value |
| --- | --- |
| `CACHE_TTL_MS` | 300_000 |
| `RAIL_CARD_LIMIT` | 8 |
| `HUB_LIST_PAGE_TOP` | 6 |
| `HUB_LIST_RANK_TOP` | 10 |
| `SEARCH_MIN_LENGTH` | 2 |
| `SEARCH_MAX_RESULTS` | 10 |
| `TOPIC_DESCRIPTION_MAX_CODE_POINTS` | 280 |
| `MIN_PROBLEMS_FOR_DISCOVERY` | 5 |
| `MIN_OWNERS_COMMONLY_TRACKED` | 3 |
| `MIN_PEERS_BENCHMARK` | 5 |
| `MIN_USERS_PATTERN` | 10 |
| `RATE_LIMIT_SEARCH_PER_MIN` | 30 |
| `RATE_LIMIT_FOR_YOU_PER_MIN` | 30 |
| `RATE_LIMIT_PROFILE_READ_PER_MIN` | 120 |
| `RATE_LIMIT_COPY_PER_MIN` | 20 |
| `COMPARE_WEEKS_DEFAULT` | 12 |
| `COMPARE_WEEKS_OPTIONS` | 4, 12, 26 |
| `PUBLIC_LIST_MIN_PROBLEMS` | 5 |
| `SPECIALIST_MIN_PROBLEMS` | 15 |
| `SPECIALIST_MIN_COMPLETION` | 0.6 |
| `AHEAD_MAX_MULTIPLIER` | 4 |
| `CONSISTENT_MIN_ACTIVE_WEEKS` | 8 |
| `CONSISTENT_SIZE_MIN_RATIO` | 0.5 |
| `CONSISTENT_SIZE_MAX_RATIO` | 3 |
| `INSIGHT_MAX` | 4 |

### Analytics (`discover_events`)

Allow-listed event names:

`discover_open`, `discover_search`, `discover_profile_view`, `discover_compare_open`, `discover_topic_hub_open`, `discover_list_open`, `discover_topic_copy`, `discover_problem_add`, `discover_onboarding_skip`, `discover_onboarding_start`, `discover_share_visibility_save`, `discover_follow` (D7).

### Feature flag

| Env | Values | Semantics |
| --- | --- | --- |
| `DISCOVER_MODE` (backend) | `off`, `sharing`, `full` | `off`: no discovery APIs/UI. `sharing`: owner settings + self preview at `/app/u/:me`. `full`: all discovery. |
| `VITE_DISCOVER_MODE` (frontend) | same | Must match backend for local dev. |

Default: `off`.

### Handles and house account

| Item | Value |
| --- | --- |
| New reserved handles (E1) | `discover`, `u` |
| House handle | `starter` |
| House display name | Practice starter lists |
| House email | `starter@practice.invalid` |
| House password | none (seed insert only) |
| List badge | Starter |

Rejected house handle `practice`: already in `USER_HANDLE_RESERVED_LIST`.

### Module boundary

- Single Nest module: `src/modules/discover/`.
- All cross-user reads through `discover/visibility.ts`.
- No other module queries another user’s problems/topics for discovery.

### Starter list topic keys

Display names in [starter-lists.data.ts](../src/database/seed/starter-lists.data.ts) normalize with `normalizeTopicName` (`en-US` lower case) for hub `topicKey`:

| Display name | `normalized_name` / topicKey |
| --- | --- |
| Arrays & Hashing | `arrays & hashing` |
| Two Pointers | `two pointers` |
| Binary Search | `binary search` |
| Trees | `trees` |
| Graphs | `graphs` |
| Dynamic Programming | `dynamic programming` |
| Greedy | `greedy` |
| Monotonic Stack | `monotonic stack` |

## Rejected alternatives

| Alternative | Why rejected |
| --- | --- |
| Global leaderboards | REQUIREMENTS §10; grind shame |
| Public notes on shared lists | Privacy promise |
| Exact solve timestamps on profiles | Invasive; weekly buckets suffice |
| House handle `@practice` | Reserved; use `@starter` |
| FR-09 for discovery | FR-09 is Resend email |

---

## Copy deck (E1 → `solve-tracker-frontend/src/lib/discover/copy.ts`)

Use `{{param}}` for interpolation. Forbidden in user-facing discovery copy: `rank`, `top`, `beat`, `better`, `worse`, `leaderboard`, `#1`, `winner`, `loser`.

### Navigation

| Key | Text |
| --- | --- |
| `nav.discover` | Discover |
| `nav.forYou` | For you |
| `nav.people` | People |
| `nav.topics` | Topics |
| `discover.pageTitle` | Discover |
| `discover.pageSubtitle` | Find people who practice like you and learn from how they train. |
| `discover.seeAll` | See all |

### Practice visibility panel

| Key | Text |
| --- | --- |
| `visibility.panelTitle` | Practice visibility |
| `visibility.panelIntro` | Choose what other signed-in users can see about your practice. |
| `visibility.optionPrivateTitle` | Only me |
| `visibility.optionPrivateHint` | Nobody can find or view your practice. |
| `visibility.optionSummaryTitle` | Practice summary |
| `visibility.optionSummaryHint` | Counts, streak, weekly activity, and platform mix. |
| `visibility.optionTopicsTitle` | Summary + topics |
| `visibility.optionTopicsHint` | Also your topic names and progress. Share problem lists per topic on Topics. |
| `visibility.neverShared` | Never shared: email, notes, exact solve times, private topics, and who viewed you. |
| `visibility.viewAsOthers` | View as others |
| `visibility.copyLink` | Copy link |
| `visibility.viewAsOthersDisabledPrivate` | Turn on sharing to preview. |
| `visibility.systemHandleHint` | People will see you as @{{handle}}. Choose a handle in your profile. |
| `visibility.shareStats` | This month: profile viewed {{views}}× · your lists copied {{copies}}× |
| `visibility.goalLabel` | Practicing for (optional) |
| `visibility.goalNotSet` | Not set |

### Topics sharing

| Key | Text |
| --- | --- |
| `topics.sharePublic` | Public |
| `topics.sharePrivate` | Private |
| `topics.shareMenuHint` | Public topics show their problem list on your practice profile. Notes stay private. |
| `topics.sharingOffBanner` | Topic sharing is off. Change in Profile → Practice visibility. |
| `topics.shareTopicsCta` | Share topics |
| `topics.descriptionLabel` | Description (optional) |
| `topics.descriptionCounter` | {{count}} / 280 |
| `topics.communityHint` | {{practicers}} people practice {{topicName}} · {{listCount}} public lists |
| `topics.communityHintExplore` | Explore |
| `topics.shareStatsRow` | Viewed {{views}}× · copied {{copies}}× this month |
| `topics.createdHint` | {{practicers}} people practice {{topicName}} · {{listCount}} public lists → Explore |

### Discover rails and cards

| Key | Text |
| --- | --- |
| `rail.peers` | People like you |
| `rail.ahead` | A step ahead |
| `rail.sameGoal` | Same goal |
| `rail.consistent` | Consistent practicers |
| `rail.activeWeek` | Active this week |
| `rail.starterLists` | Starter lists by @starter |
| `rail.similar` | Similar practicers |
| `card.view` | View |
| `card.compare` | Compare |
| `card.starterBadge` | Starter |
| `reason.sharedTopicsPlatforms` | Shares {{sharedTopics}} · {{platforms}} · ~{{solvesPerWeek}}/week |
| `reason.aheadShared` | Solved more in your shared topics |
| `reason.sameGoal` | Also {{goalLabel}} · {{platforms}} |
| `reason.consistent` | Active {{activeWeeks}} of 12 weeks · ~{{solvesPerWeek}}/week |
| `reason.activeWeek` | +{{solvesThisWeek}} this week · {{topics}} |
| `reason.listCard` | Copied {{copies}}× · {{count}} problems · {{descriptionSnippet}} |
| `reason.inLists` | In {{count}} lists |
| `reason.topicSpecialist` | {{count}} {{topicName}} problems · {{percent}}% solved |

### Empty, below-k, unavailable

| Key | Text |
| --- | --- |
| `empty.noSearchMatch` | No practice profile with that handle. |
| `empty.noDiscoverableUsers` | No one is sharing practice yet. Be the first — share yours from Profile. |
| `empty.noTopicOverlap` | Add a few topics to get suggestions. |
| `empty.beFirstTopicList` | Be the first to share a {{topicName}} list. |
| `unavailable.profileTitle` | This practice profile isn’t available |
| `unavailable.profileBody` | It may be private or the handle may not exist. |
| `unavailable.profileAskFriend` | Ask them to share their practice from Profile → Practice visibility. |

### Opt-in and onboarding

| Key | Text |
| --- | --- |
| `banner.browsePrivate` | You’re browsing privately. Share your practice so people like you can find you too. |
| `banner.shareCta` | Share practice |
| `onboarding.title` | Discover how others practice |
| `onboarding.step1` | See people with similar topics and find great lists. Your library stays private unless you share it. |
| `onboarding.step2Goal` | What are you practicing for? (optional) |
| `onboarding.step3Share` | Share your practice? |
| `onboarding.skip` | Skip |
| `onboarding.start` | Start exploring |
| `launch.banner` | New: Discover how others practice — your library stays private unless you share it. |
| `launch.bannerCta` | Open Discover |

### Profile and public topic

| Key | Text |
| --- | --- |
| `profile.practicingSince` | Practicing since {{monthYear}} |
| `profile.compareWithMe` | Compare with me |
| `profile.follow` | Follow |
| `profile.viewAsBanner` | This is how others see you. |
| `profile.editVisibility` | Edit visibility |
| `profile.publicLists` | Public lists |
| `list.copyTopic` | Copy topic to my library |
| `list.moreLists` | More {{topicName}} lists |
| `list.ownerCompletion` | {{solved}} / {{total}} solved by owner |
| `list.copiedCount` | Copied {{copies}}× this month |
| `row.open` | Open |
| `row.add` | Add |
| `row.added` | Added |
| `row.inLibrary` | In library |
| `row.youColumn` | You |

### Compare and insights

| Key | Text |
| --- | --- |
| `compare.title` | You vs @{{handle}} |
| `compare.vsPeers` | vs people like you |
| `compare.vsPerson` | vs @{{handle}} |
| `compare.window` | Last {{weeks}} weeks |
| `compare.summaryOnlyTopics` | @{{handle}} shares only a summary. Topic comparison isn’t available. |
| `insight.cadenceGap` | @{{handle}} practices every week; you were active {{yourWeeks}} of {{weeks}} weeks. |
| `insight.topicFocusGap` | {{topicName}} is {{theirPercent}}% of their practice and {{yourPercent}}% of yours. |
| `insight.missingTopic` | They practice “{{topicName}}” — you don’t have it yet. |
| `insight.platformConcentration` | They focus more on {{platformName}} than you do. |
| `insight.action.openList` | Open their {{topicName}} list |
| `insight.action.copyTopic` | Copy topic |
| `insight.action.filterLibrary` | Open in your library |

### Dashboard

| Key | Text |
| --- | --- |
| `dashboard.benchmarkTitle` | How you compare |
| `dashboard.benchmarkPeers` | people like you |
| `dashboard.benchmarkActiveWeeks` | Active weeks |
| `dashboard.benchmarkSolvesPerWeek` | Solved / week |
| `dashboard.benchmarkTopTopicShare` | Top topic share |
| `dashboard.benchmarkSeePeople` | See people like you |
| `dashboard.benchmarkCompare` | Compare |
| `dashboard.peopleLikeYouTitle` | People like you |
| `dashboard.peopleLikeYouLine` | @{{handles}} and {{count}} others share your top topics. |
| `dashboard.starterNudge` | Explore starter lists while more people share their practice. |

### Contextual panels

| Key | Text |
| --- | --- |
| `ideas.panelTitle` | Ideas from the community ({{count}}) |
| `ideas.panelSubtitle` | Commonly tracked {{topicName}} problems you don’t have |
| `ideas.seeHub` | See {{topicName}} hub |
| `community.panelTitle` | In the community |
| `community.inLists` | In {{count}} public lists · {{topics}} |
| `community.seeHub` | See {{topicName}} hub |

### Toasts

| Key | Text |
| --- | --- |
| `toast.copyTopicSuccess` | Added {{added}} · {{linked}} already in your library · into your topic {{topicName}} |
| `toast.copyTopicOpen` | Open topic |
| `toast.linkCopied` | Link copied |
| `toast.problemAdded` | Problem added |

### Search combobox

| Key | Text |
| --- | --- |
| `search.placeholder` | Search by @handle or name |
| `search.option` | @{{handle}} · {{name}} · {{solved}} solved |

---

## E0 sign-off

| Step | Done | Date |
| --- | --- | --- |
| E0.1 REQUIREMENTS FR-10 | ☑ | 2026-11-18 |
| E0.2 This decision record | ☑ | 2026-11-18 |
| E0.3 Copy deck above | ☑ | 2026-11-18 |
| E0.4 starter-lists.data.ts | ☑ | 2026-11-18 |