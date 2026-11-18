import {
  INSIGHT_CADENCE_ACTIVE_WEEK_GAP,
  INSIGHT_MAX,
  INSIGHT_PLATFORM_GAP_MIN,
  INSIGHT_TOPIC_SHARE_GAP_MIN,
} from './discover.config.js';
import type { CompareSide, CompareTopicRow } from './compare.js';

export type InsightActionKind =
  | 'openList'
  | 'copyTopic'
  | 'filterLibrary'
  | 'viewProfile';

export type InsightAction = {
  kind: InsightActionKind;
  handle?: string;
  topicId?: string;
  topicName?: string;
  normalizedName?: string;
};

export type CompareInsight = {
  kind:
    | 'cadence_gap'
    | 'top_topic_concentration'
    | 'topic_focus_gap'
    | 'missing_topic'
    | 'platform_concentration';
  text: string;
  action: InsightAction | null;
};

export type InsightContext = {
  subjectHandle: string;
  weeks: number;
  subjectTopicsVisible: boolean;
  subjectPublicTopics: Array<{
    topicId: string;
    name: string;
    normalizedName: string;
  }>;
  viewerTopicNames: Set<string>;
};

function platformGap(
  me: CompareSide,
  them: CompareSide,
): { slug: string; gap: number } | undefined {
  let best: { slug: string; gap: number } | undefined;
  for (const tp of them.platformShares) {
    const mine = me.platformShares.find((p) => p.slug === tp.slug)?.percent ?? 0;
    const gap = tp.percent - mine;
    if (gap >= INSIGHT_PLATFORM_GAP_MIN && (!best || gap > best.gap)) {
      best = { slug: tp.slug, gap };
    }
  }
  return best;
}

export function buildCompareInsights(
  me: CompareSide,
  them: CompareSide,
  topicRows: CompareTopicRow[],
  ctx: InsightContext,
): CompareInsight[] {
  const out: CompareInsight[] = [];

  if (
    them.activeWeeks - me.activeWeeks >= INSIGHT_CADENCE_ACTIVE_WEEK_GAP &&
    them.activeWeeks >= me.activeWeeks
  ) {
    out.push({
      kind: 'cadence_gap',
      text: `@${ctx.subjectHandle} practices every week; you were active ${me.activeWeeks} of ${ctx.weeks} weeks.`,
      action: null,
    });
  }

  const theirTop = them.topicShares[0];
  const myTopShare = theirTop
    ? (me.topicShares.find((t) => t.normalizedName === theirTop.normalizedName)
        ?.percent ?? 0)
    : 0;
  if (
    theirTop &&
    ctx.subjectTopicsVisible &&
    theirTop.percent - myTopShare >= INSIGHT_TOPIC_SHARE_GAP_MIN
  ) {
    out.push({
      kind: 'top_topic_concentration',
      text: `${theirTop.name} is ${theirTop.percent}% of their practice and ${myTopShare}% of yours.`,
      action: {
        kind: 'openList',
        handle: ctx.subjectHandle,
        topicName: theirTop.name,
        normalizedName: theirTop.normalizedName,
      },
    });
  }

  if (ctx.subjectTopicsVisible) {
    let bestRow: CompareTopicRow | undefined;
    for (const row of topicRows) {
      const gap = Math.abs(row.theirPercent - row.yourPercent);
      if (gap >= INSIGHT_TOPIC_SHARE_GAP_MIN && (!bestRow || gap > Math.abs(bestRow.theirPercent - bestRow.yourPercent))) {
        bestRow = row;
      }
    }
    if (bestRow && bestRow.theirPercent > 0) {
      out.push({
        kind: 'topic_focus_gap',
        text: `${bestRow.name} is ${bestRow.theirPercent}% of their practice and ${bestRow.yourPercent}% of yours.`,
        action: {
          kind: 'openList',
          handle: ctx.subjectHandle,
          topicName: bestRow.name,
          normalizedName: bestRow.normalizedName,
        },
      });
    }

    for (const pub of ctx.subjectPublicTopics) {
      if (out.length >= INSIGHT_MAX) break;
      if (ctx.viewerTopicNames.has(pub.normalizedName)) continue;
      out.push({
        kind: 'missing_topic',
        text: `They practice "${pub.name}" — you don't have it yet.`,
        action: {
          kind: 'copyTopic',
          handle: ctx.subjectHandle,
          topicId: pub.topicId,
          topicName: pub.name,
        },
      });
      break;
    }
  }

  const plat = platformGap(me, them);
  if (plat && out.length < INSIGHT_MAX) {
    out.push({
      kind: 'platform_concentration',
      text: `They focus more on ${plat.slug} than you do.`,
      action: { kind: 'filterLibrary' },
    });
  }

  return out.slice(0, INSIGHT_MAX);
}

export function firstInsight(
  insights: CompareInsight[],
): CompareInsight | null {
  return insights[0] ?? null;
}