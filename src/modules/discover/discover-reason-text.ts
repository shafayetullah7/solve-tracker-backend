import type { DiscoverReason } from './rails.js';

export function formatDiscoverReason(reason: DiscoverReason): string {
  const v = reason.values;
  switch (reason.kind) {
    case 'shared_topics_platforms_cadence': {
      const topics =
        reason.sharedTopics && reason.sharedTopics.length > 0
          ? reason.sharedTopics.join(', ')
          : 'shared topics';
      const platforms = String(v.platforms ?? '');
      const weekly = v.weekly ?? '';
      return `Shares ${topics} · ${platforms} · ~${weekly}/week`;
    }
    case 'ahead_in_shared_topics':
      return `Solved ${v.multiplier ?? 2}× more in your shared topics`;
    case 'same_goal': {
      const platforms = String(v.platforms ?? '');
      return platforms ? `Also ${v.goal} · ${platforms}` : `Also ${v.goal}`;
    }
    case 'consistent_cadence':
      return `Active ${v.activeWeeks ?? 8} of 12 weeks · ~${v.weekly ?? 4}/week`;
    case 'active_this_week': {
      const topics =
        reason.sharedTopics && reason.sharedTopics.length > 0
          ? reason.sharedTopics.join(', ')
          : 'practice';
      return `+${v.solvesThisWeek ?? 0} this week · ${topics}`;
    }
    case 'following':
      return 'Following';
    default:
      return '';
  }
}