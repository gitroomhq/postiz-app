import type { NormalizedPostMetrics } from './social.integrations.interface.ts';

export function asCount(value: unknown): number | null {
  if (value == null || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.round(value) : null;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.round(parsed) : null;
  }
  if (typeof value === 'object') {
    let sum = 0;
    let any = false;
    for (const nested of Object.values(value as Record<string, unknown>)) {
      const count = asCount(nested);
      if (count == null) {
        continue;
      }
      any = true;
      sum += count;
    }
    return any ? sum : null;
  }
  return null;
}

export function engagementRate(
  impressions: number | null,
  reactions: number | null,
  comments: number | null
): number | null {
  if (impressions == null || impressions <= 0) {
    return null;
  }
  if (reactions == null || comments == null) {
    return null;
  }
  return ((reactions + comments) / impressions) * 100;
}

export function hasKnownPostMetric(metrics: NormalizedPostMetrics): boolean {
  return (
    metrics.impressions != null ||
    metrics.reactions != null ||
    metrics.comments != null ||
    metrics.shares != null
  );
}

export function sumXPublicMetrics(
  items: Array<{
    impression_count?: number;
    like_count?: number;
    reply_count?: number;
    retweet_count?: number;
    quote_count?: number;
    bookmark_count?: number;
  } | null | undefined>
): Record<string, number> {
  const totals: Record<string, number> = {};
  const keys = [
    'impression_count',
    'like_count',
    'reply_count',
    'retweet_count',
    'quote_count',
    'bookmark_count',
  ] as const;
  for (const metrics of items) {
    for (const key of keys) {
      const count = asCount(metrics?.[key]);
      if (count != null) {
        totals[key] = (totals[key] || 0) + count;
      }
    }
  }
  return totals;
}

function row(
  platformPostId: string,
  fields: Omit<NormalizedPostMetrics, 'platformPostId'>
): NormalizedPostMetrics {
  return { platformPostId, ...fields };
}

export function mapXPublicMetrics(
  platformPostId: string,
  metrics: {
    impression_count?: number;
    like_count?: number;
    reply_count?: number;
    retweet_count?: number;
    quote_count?: number;
    bookmark_count?: number;
  } | null | undefined
): NormalizedPostMetrics {
  const raw: Record<string, number> = {};
  const quotes = asCount(metrics?.quote_count);
  const bookmarks = asCount(metrics?.bookmark_count);
  if (quotes != null) raw.quotes = quotes;
  if (bookmarks != null) raw.bookmarks = bookmarks;
  return row(platformPostId, {
    impressions: asCount(metrics?.impression_count),
    reactions: asCount(metrics?.like_count),
    comments: asCount(metrics?.reply_count),
    shares: asCount(metrics?.retweet_count),
    raw: Object.keys(raw).length ? raw : undefined,
  });
}

export function mapLinkedInShareStats(
  platformPostId: string,
  stats?: {
    impressionCount?: number;
    likeCount?: number;
    commentCount?: number;
    shareCount?: number;
    clickCount?: number;
    uniqueImpressionsCount?: number;
    engagement?: number;
  } | null,
  socialActions?: {
    likesSummary?: { totalLikes?: number };
    commentsSummary?: { totalFirstLevelComments?: number };
  } | null
): NormalizedPostMetrics {
  const raw: Record<string, number> = {};
  const clicks = asCount(stats?.clickCount);
  const unique = asCount(stats?.uniqueImpressionsCount);
  if (clicks != null) raw.clicks = clicks;
  if (unique != null) raw.uniqueImpressions = unique;
  return row(platformPostId, {
    impressions: asCount(stats?.impressionCount),
    reactions:
      asCount(stats?.likeCount) ?? asCount(socialActions?.likesSummary?.totalLikes),
    comments:
      asCount(stats?.commentCount) ??
      asCount(socialActions?.commentsSummary?.totalFirstLevelComments),
    shares: asCount(stats?.shareCount),
    raw: Object.keys(raw).length ? raw : undefined,
  });
}

type GraphInsight = {
  name?: string;
  values?: Array<{ value?: unknown; end_time?: string }>;
  total_value?: { value?: unknown };
};

export function insightTimeSeries(
  values: Array<{ value?: unknown; end_time?: string }> | undefined,
  today: string,
): Array<{ total: string; date: string }> {
  const points: Array<{ total: string; date: string }> = [];
  for (const row of values || []) {
    const total = asCount(row.value);
    if (total == null) {
      continue;
    }
    points.push({
      total: String(total),
      date: row.end_time?.slice(0, 10) || today,
    });
  }
  return points;
}

function insightValue(metric: GraphInsight): unknown {
  return metric.values?.[0]?.value ?? metric.total_value?.value;
}

function insightsByName(data: GraphInsight[] | null | undefined) {
  const out: Record<string, unknown> = {};
  for (const metric of data || []) {
    if (!metric.name) {
      continue;
    }
    out[metric.name] = insightValue(metric);
  }
  return out;
}

export function mapInstagramMediaInsights(
  platformPostId: string,
  data: GraphInsight[] | null | undefined
): NormalizedPostMetrics {
  const byName = insightsByName(data);
  const raw: Record<string, number> = {};
  const reach = asCount(byName.reach);
  const saves = asCount(byName.saved);
  if (reach != null) raw.reach = reach;
  if (saves != null) raw.saves = saves;
  return row(platformPostId, {
    impressions: asCount(byName.views),
    reactions: asCount(byName.likes),
    comments: asCount(byName.comments),
    shares: asCount(byName.shares),
    raw: Object.keys(raw).length ? raw : undefined,
  });
}

export function mapFacebookPostInsights(
  platformPostId: string,
  data: GraphInsight[] | null | undefined
): NormalizedPostMetrics {
  const byName = insightsByName(data);
  const raw: Record<string, number> = {};
  const clicks = asCount(byName.post_clicks);
  if (clicks != null) raw.clicks = clicks;
  return row(platformPostId, {
    impressions: asCount(byName.post_total_media_view_unique),
    reactions: asCount(byName.post_reactions_by_type_total),
    comments: null,
    shares: null,
    raw: Object.keys(raw).length ? raw : undefined,
  });
}

export function mapTikTokVideoStats(
  platformPostId: string,
  video: {
    view_count?: number;
    like_count?: number;
    comment_count?: number;
    share_count?: number;
  } | null | undefined
): NormalizedPostMetrics {
  return row(platformPostId, {
    impressions: asCount(video?.view_count),
    reactions: asCount(video?.like_count),
    comments: asCount(video?.comment_count),
    shares: asCount(video?.share_count),
  });
}

export function mapTikTokBusinessVideoStats(
  platformPostId: string,
  video: {
    video_views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
  } | null | undefined
): NormalizedPostMetrics {
  return row(platformPostId, {
    impressions: asCount(video?.video_views),
    reactions: asCount(video?.likes),
    comments: asCount(video?.comments),
    shares: asCount(video?.shares),
  });
}

export function mapYouTubeVideoStatistics(
  platformPostId: string,
  stats: {
    viewCount?: string | number | null;
    likeCount?: string | number | null;
    commentCount?: string | number | null;
    favoriteCount?: string | number | null;
  } | null | undefined
): NormalizedPostMetrics {
  const raw: Record<string, number> = {};
  const favorites = asCount(stats?.favoriteCount);
  if (favorites != null) raw.favorites = favorites;
  return row(platformPostId, {
    impressions: asCount(stats?.viewCount),
    reactions: asCount(stats?.likeCount),
    comments: asCount(stats?.commentCount),
    shares: null,
    raw: Object.keys(raw).length ? raw : undefined,
  });
}

export function mapThreadsInsights(
  platformPostId: string,
  data: GraphInsight[] | null | undefined
): NormalizedPostMetrics {
  const byName = insightsByName(data);
  const raw: Record<string, number> = {};
  const quotes = asCount(byName.quotes);
  if (quotes != null) raw.quotes = quotes;
  return row(platformPostId, {
    impressions: asCount(byName.views),
    reactions: asCount(byName.likes),
    comments: asCount(byName.replies),
    shares: asCount(byName.reposts),
    raw: Object.keys(raw).length ? raw : undefined,
  });
}

export function mapPinterestLifetimeMetrics(
  platformPostId: string,
  lifetime?: {
    IMPRESSION?: number;
    PIN_CLICK?: number;
    OUTBOUND_CLICK?: number;
    SAVE?: number;
  } | null
): NormalizedPostMetrics {
  const raw: Record<string, number> = {};
  const pinClick = asCount(lifetime?.PIN_CLICK);
  const outbound = asCount(lifetime?.OUTBOUND_CLICK);
  const saves = asCount(lifetime?.SAVE);
  if (pinClick != null) raw.pinClicks = pinClick;
  if (outbound != null) raw.outboundClicks = outbound;
  if (saves != null) raw.saves = saves;
  return row(platformPostId, {
    impressions: asCount(lifetime?.IMPRESSION),
    reactions: null,
    comments: null,
    shares: null,
    raw: Object.keys(raw).length ? raw : undefined,
  });
}
