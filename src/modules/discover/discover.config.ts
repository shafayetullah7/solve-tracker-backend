/** Locked values — see docs/DISCOVER_E0_DECISIONS.md */
export const DISCOVER_CACHE_TTL_MS = 300_000;
export const DISCOVER_CACHE_MAX_ENTRIES = 5_000;

export const RAIL_CARD_LIMIT = 8;
export const HUB_LIST_PAGE_TOP = 6;
export const HUB_LIST_RANK_TOP = 10;
export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_RESULTS = 10;
export const TOPIC_DESCRIPTION_MAX_CODE_POINTS = 280;

export const MIN_PROBLEMS_FOR_DISCOVERY = 5;
export const PUBLIC_LIST_MIN_PROBLEMS = 5;
export const MIN_OWNERS_COMMONLY_TRACKED = 3;
export const MIN_TOPIC_HINT = 3;
export const MIN_PEERS_BENCHMARK = 5;
export const PEER_COMPARE_POOL = 30;

export const COMPARE_WEEKS_DEFAULT = 12;
export const COMPARE_WEEKS_OPTIONS = [4, 12, 26] as const;
export const INSIGHT_MAX = 4;
export const INSIGHT_TOPIC_SHARE_GAP_MIN = 10;
export const INSIGHT_PLATFORM_GAP_MIN = 15;
export const INSIGHT_CADENCE_ACTIVE_WEEK_GAP = 2;
export const MIN_USERS_PATTERN = 10;
export const SPECIALIST_MIN_PROBLEMS = 15;
export const SPECIALIST_MIN_COMPLETION = 0.6;
export const TOPIC_KEY_MAX_CODE_POINTS = 100;

export const RATE_LIMIT_SEARCH_PER_MIN = 30;
export const RATE_LIMIT_FOR_YOU_PER_MIN = 30;
export const RATE_LIMIT_PROFILE_READ_PER_MIN = 120;
export const RATE_LIMIT_COPY_PER_MIN = 20;
export const RATE_LIMIT_PUBLIC_READ_PER_MIN = 60;
export const DISCOVER_REPORT_REASON_MAX = 500;

export const PROFILE_NOT_FOUND_MESSAGE =
  'This practice profile is not available.';

export const RAIL_MIN_CARDS = 3;
export const PEOPLE_PAGE_SIZE = 20;

export const PEER_WEIGHT_TOPIC = 0.5;
export const PEER_WEIGHT_PLATFORM = 0.2;
export const PEER_WEIGHT_SIZE = 0.2;
export const PEER_WEIGHT_RECENT = 0.1;
export const PLATFORM_SIM_THRESHOLD = 0.8;

export const AHEAD_MIN_MULTIPLIER = 1.5;
export const AHEAD_MAX_MULTIPLIER = 4;
export const AHEAD_SMALL_LIBRARY_VIEWER_MAX = 9;
export const AHEAD_SMALL_LIBRARY_SOLVED_MIN = 10;
export const AHEAD_SMALL_LIBRARY_SOLVED_MAX = 60;
export const AHEAD_RECENT_WEEKS = 4;

export const CONSISTENT_MIN_ACTIVE_WEEKS = 8;
export const CONSISTENT_SIZE_MIN_RATIO = 0.5;
export const CONSISTENT_SIZE_MAX_RATIO = 3;

export const RECENT_ACTIVITY_OVERLAP_WEEKS = 4;
export const RECENT_ACTIVITY_OVERLAP_MIN = 2;

export const DISCOVER_EVENTS_MAX_BATCH = 20;

export const DISCOVER_EVENT_NAMES = [
  'discover_open',
  'discover_search',
  'discover_profile_view',
  'discover_compare_open',
  'discover_topic_hub_open',
  'discover_list_open',
  'discover_topic_copy',
  'discover_problem_add',
  'discover_onboarding_skip',
  'discover_onboarding_start',
  'discover_share_visibility_save',
  'discover_follow',
] as const;

export type DiscoverEventName = (typeof DISCOVER_EVENT_NAMES)[number];