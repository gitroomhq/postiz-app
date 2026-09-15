export type AnalyticsSort =
  | 'reactions'
  | 'comments'
  | 'impressions'
  | 'engagement'
  | 'published';
export type AnalyticsDir = 'asc' | 'desc';

export type AnalyticsPostRow = {
  id: string;
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
  sort: AnalyticsSort | undefined
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
  dir: AnalyticsDir = 'desc'
) {
  const direction = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const diff = sortValue(a, sort) - sortValue(b, sort);
    if (diff !== 0) {
      return diff * direction;
    }
    return a.id.localeCompare(b.id);
  });
}

export function matchesAnalyticsQuery(
  row: AnalyticsPostRow,
  query?: string,
  platform?: string
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
  pick: (row: AnalyticsPostRow) => number | null
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

function snapshotEngagementRate(
  impressions: number | null,
  reactions: number | null,
  comments: number | null
): number | null {
  if (impressions == null || impressions <= 0) {
    return null;
  }
  if (reactions == null && comments == null) {
    return null;
  }
  return (((reactions ?? 0) + (comments ?? 0)) / impressions) * 100;
}

export function mapSnapshotRow(post: {
  id: string;
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
      latest?.comments ?? null
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
