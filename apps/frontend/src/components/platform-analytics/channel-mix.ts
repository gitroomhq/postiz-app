export type ChannelMixRow = {
  integrationId: string;
  platform: string;
  channelName: string;
  posts: number;
  impressions: number | null;
};

export const CHANNEL_MIX_LIMIT = 6;

/** Top 6 by impressions (then posts). Zero/unknown impressions stay out. Rest → Other. */
export function capChannelMix(
  rows: ChannelMixRow[],
  limit = CHANNEL_MIX_LIMIT,
): {
  visible: ChannelMixRow[];
  other: { count: number; posts: number; impressions: number } | null;
} {
  const ranked = rows
    .filter((row) => (row.impressions ?? 0) > 0)
    .sort(
      (a, b) =>
        (b.impressions ?? 0) - (a.impressions ?? 0) || b.posts - a.posts,
    );
  if (ranked.length <= limit) {
    return { visible: ranked, other: null };
  }
  const visible = ranked.slice(0, limit);
  const rest = ranked.slice(limit);
  return {
    visible,
    other: {
      count: rest.length,
      posts: rest.reduce((sum, row) => sum + row.posts, 0),
      impressions: rest.reduce((sum, row) => sum + (row.impressions ?? 0), 0),
    },
  };
}
