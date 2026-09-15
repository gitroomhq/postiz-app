export type AnalyticsSort =
  'reactions' | 'comments' | 'impressions' | 'engagement' | 'published';
export type AnalyticsDir = 'asc' | 'desc';

export function analyticsPublishDateRange(days: number, now = new Date()) {
  const from = new Date(now);
  from.setUTCHours(0, 0, 0, 0);
  from.setUTCDate(from.getUTCDate() - Math.max(0, days - 1));

  const to = new Date(now);
  to.setUTCHours(23, 59, 59, 999);

  return { from, to };
}

export type AnalyticsPostRow = {
  id: string;
  group: string;
  content: string;
  thumbnail: string | null;
  publishDate: string;
  releaseURL: string | null;
  integrationId: string;
  platform: string;
  channelName: string;
  channelPicture: string | null;
  impressions: number | null;
  reactions: number | null;
  comments: number | null;
  shares: number | null;
  engagementRate: number | null;
  previous: {
    impressions: number | null;
    reactions: number | null;
    comments: number | null;
  } | null;
};

export const ANALYTICS_AGENT_NOTES = {
  dateFiltersWhichPostsByPublishDate: true,
  numbersAreCurrentLifetimeTotals: true,
  nullMeansUnknownNotZero: true,
  facebookCommentsNotReturned: true,
  pinterestReactionsAndCommentsNotReturned: true,
  googleBusinessHasNoPostMetrics: true,
} as const;

export function previewText(content: string, max = 280) {
  const plain = (content || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= max) {
    return plain;
  }
  return `${plain.slice(0, max).trimEnd()}…`;
}

export function firstMediaPath(image: string | null): string | null {
  try {
    const media = JSON.parse(image || '[]') as Array<{
      path?: string;
      thumbnail?: string;
    }>;
    return media[0]?.thumbnail || media[0]?.path || null;
  } catch {
    return null;
  }
}

export function sortValue(
  row: AnalyticsPostRow,
  sort: AnalyticsSort | undefined,
): number {
  switch (sort) {
    case 'comments':
      return row.comments ?? -1;
    case 'impressions':
      return row.impressions ?? -1;
    case 'engagement':
      return row.engagementRate ?? -1;
    case 'published':
      return new Date(row.publishDate).getTime();
    case 'reactions':
    default:
      return row.reactions ?? -1;
  }
}

export function sortAnalyticsPosts(
  rows: AnalyticsPostRow[],
  sort: AnalyticsSort = 'reactions',
  dir: AnalyticsDir = 'desc',
) {
  const direction = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (sort !== 'published') {
      const field = sort === 'engagement' ? 'engagementRate' : sort;
      const leftUnknown = a[field] == null;
      const rightUnknown = b[field] == null;
      if (leftUnknown !== rightUnknown) {
        return leftUnknown ? 1 : -1;
      }
    }
    const diff = sortValue(a, sort) - sortValue(b, sort);
    if (diff !== 0) {
      return diff * direction;
    }
    return a.id.localeCompare(b.id);
  });
}

export function topAnalyticsPosts(
  rows: AnalyticsPostRow[],
  metric: 'reactions' | 'comments',
  limit = 5,
) {
  return sortAnalyticsPosts(
    rows.filter((row) => row[metric] != null),
    metric,
    'desc',
  ).slice(0, limit);
}

export function matchesAnalyticsQuery(
  row: AnalyticsPostRow,
  query?: string,
  platform?: string,
) {
  if (platform && row.platform !== platform) {
    return false;
  }
  const needle = query?.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  const hay = [
    row.id,
    row.content,
    row.channelName,
    row.platform,
    previewText(row.content),
  ]
    .join(' ')
    .toLowerCase();
  return hay.includes(needle);
}

export function sumKnown(
  rows: AnalyticsPostRow[],
  pick: (row: AnalyticsPostRow) => number | null,
): number | null {
  let total = 0;
  let any = false;
  for (const row of rows) {
    const value = pick(row);
    if (value == null) {
      continue;
    }
    any = true;
    total += value;
  }
  return any ? total : null;
}

export function sumComplete(
  rows: AnalyticsPostRow[],
  pick: (row: AnalyticsPostRow) => number | null
): number | null {
  if (rows.length === 0) {
    return null;
  }
  let total = 0;
  for (const row of rows) {
    const value = pick(row);
    if (value == null) {
      return null;
    }
    total += value;
  }
  return total;
}

export function summarizeAnalyticsPosts(rows: AnalyticsPostRow[]) {
  const channelRows = new Map<
    string,
    {
      integrationId: string;
      platform: string;
      channelName: string;
      rows: AnalyticsPostRow[];
    }
  >();
  const weekdays = [0, 0, 0, 0, 0, 0, 0];

  for (const row of rows) {
    const channel = channelRows.get(row.integrationId) || {
      integrationId: row.integrationId,
      platform: row.platform,
      channelName: row.channelName,
      rows: [],
    };
    channel.rows.push(row);
    channelRows.set(row.integrationId, channel);

    const day = new Date(row.publishDate).getUTCDay();
    weekdays[day === 0 ? 6 : day - 1] += 1;
  }

  const knownReactions = sumKnown(rows, (row) => row.reactions);
  const knownComments = sumKnown(rows, (row) => row.comments);
  const reactions = sumComplete(rows, (row) => row.reactions);
  const comments = sumComplete(rows, (row) => row.comments);

  return {
    posts: rows.length,
    reactions,
    comments,
    impressions: sumComplete(rows, (row) => row.impressions),
    channels: [...channelRows.values()].map((channel) => ({
      integrationId: channel.integrationId,
      platform: channel.platform,
      channelName: channel.channelName,
      posts: channel.rows.length,
      impressions: sumComplete(channel.rows, (row) => row.impressions),
    })),
    weekdays,
    engagementMix:
      knownReactions != null || knownComments != null
        ? { reactions: knownReactions, comments: knownComments }
        : null,
  };
}

export function toAgentPost(row: AnalyticsPostRow) {
  return {
    id: row.id,
    content: previewText(row.content),
    publishDate: row.publishDate,
    releaseURL: row.releaseURL,
    integrationId: row.integrationId,
    platform: row.platform,
    channelName: row.channelName,
    impressions: row.impressions,
    reactions: row.reactions,
    comments: row.comments,
    shares: row.shares,
    engagementRate: row.engagementRate,
  };
}

const SERIES_FIELD: Record<
  string,
  'impressions' | 'reactions' | 'comments' | 'shares'
> = {
  Views: 'impressions',
  Reach: 'impressions',
  Impressions: 'impressions',
  'Media views': 'impressions',
  Likes: 'reactions',
  Reactions: 'reactions',
  Comments: 'comments',
  Shares: 'shares',
  Retweets: 'shares',
  Reposts: 'shares',
};

const SERIES_RAW: Record<string, string> = {
  Saves: 'saves',
  Saved: 'saves',
  Reach: 'reach',
  Clicks: 'clicks',
  Quotes: 'quotes',
};

function dayKey(value: Date | string) {
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}

function snapshotMetric(
  snapshot: {
    impressions: number | null;
    reactions: number | null;
    comments: number | null;
    shares: number | null;
    raw: unknown;
  },
  label: string,
): number | null {
  const raw =
    snapshot.raw && typeof snapshot.raw === 'object' && !Array.isArray(snapshot.raw)
      ? (snapshot.raw as Record<string, unknown>)
      : null;
  const rawKey = SERIES_RAW[label];
  if (raw && rawKey && typeof raw[rawKey] === 'number') {
    return raw[rawKey] as number;
  }
  const field = SERIES_FIELD[label];
  if (field && snapshot[field] != null) {
    return snapshot[field];
  }
  return null;
}

export type SnapshotSeriesPoint = {
  capturedDay: Date | string;
  impressions: number | null;
  reactions: number | null;
  comments: number | null;
  shares: number | null;
  raw: unknown;
};

/** Plot captured snapshot days when live postAnalytics only returned a single lifetime point. */
export function overlaySnapshotSeries<
  T extends { label: string; data: Array<{ total: string; date: string }> },
>(live: T[], snapshots: SnapshotSeriesPoint[]): T[] {
  if (!live.length || snapshots.length < 2) {
    return live;
  }
  return live.map((series) => {
    const points = snapshots
      .map((snapshot) => {
        const total = snapshotMetric(snapshot, series.label);
        if (total == null) {
          return null;
        }
        return { total: String(total), date: dayKey(snapshot.capturedDay) };
      })
      .filter((point): point is { total: string; date: string } => point != null);
    if (points.length < 2) {
      return series;
    }
    const lastLive = series.data[series.data.length - 1];
    const lastSnap = points[points.length - 1];
    if (lastLive && lastLive.date > lastSnap.date) {
      points.push(lastLive);
    }
    return { ...series, data: points };
  });
}

function snapshotEngagementRate(
  impressions: number | null,
  reactions: number | null,
  comments: number | null,
): number | null {
  if (impressions == null || impressions <= 0) {
    return null;
  }
  if (reactions == null || comments == null) {
    return null;
  }
  return ((reactions + comments) / impressions) * 100;
}

export function mapSnapshotRow(post: {
  id: string;
  group?: string | null;
  content: string;
  image: string | null;
  publishDate: Date;
  releaseURL: string | null;
  integrationId: string;
  integration: {
    providerIdentifier: string;
    name: string;
    picture: string | null;
  };
  postMetricSnapshots: Array<{
    impressions: number | null;
    reactions: number | null;
    comments: number | null;
    shares: number | null;
  }>;
}): AnalyticsPostRow {
  const latest = post.postMetricSnapshots[0];
  const previous = post.postMetricSnapshots[1];
  return {
    id: post.id,
    group: post.group || post.id,
    content: post.content,
    thumbnail: firstMediaPath(post.image),
    publishDate: post.publishDate.toISOString(),
    releaseURL: post.releaseURL,
    integrationId: post.integrationId,
    platform: post.integration.providerIdentifier,
    channelName: post.integration.name,
    channelPicture: post.integration.picture,
    impressions: latest?.impressions ?? null,
    reactions: latest?.reactions ?? null,
    comments: latest?.comments ?? null,
    shares: latest?.shares ?? null,
    engagementRate: snapshotEngagementRate(
      latest?.impressions ?? null,
      latest?.reactions ?? null,
      latest?.comments ?? null,
    ),
    previous: previous
      ? {
          impressions: previous.impressions,
          reactions: previous.reactions,
          comments: previous.comments,
        }
      : null,
  };
}
