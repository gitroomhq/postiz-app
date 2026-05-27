import type { PlatformKey } from '../ui/platform-icons';

export type PlatformFilter = 'all' | PlatformKey;

export interface CreatorRow {
  rank: number;
  handle: string;
  primaryPlatform: PlatformKey;
  followers: number;
  growth30d: number;
  engagementRate: number;
}

export type LeaderboardSort = 'followers' | 'growth30d' | 'engagementRate';

export interface PlatformBreakdown {
  platform: PlatformKey;
  followers: number;
  growth30d: number;
  engagementRate: number;
}

export interface MetricView {
  totalFollowers: number;
  totalFollowersDeltaPct: number;
  engagementRate: number;
  engagementRateDelta: number;
  activeCreators: number;
  growthSeries: number[];
  netGrowth30d: number;
  netGrowth30dPct: number;
}

// Deterministic series so server + client render identically (no hydration drift).
function makeSeries(start: number, end: number, seedInit: number): number[] {
  const days = 30;
  const out: number[] = [];
  const trend = (end - start) / (days - 1);
  let seed = seedInit;
  for (let i = 0; i < days; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    const noise = (seed / 233280 - 0.5) * (end - start) * 0.18;
    out.push(Math.max(0, Math.round(start + trend * i + noise)));
  }
  return out;
}

export const PLATFORM_BREAKDOWN: PlatformBreakdown[] = [
  { platform: 'instagram', followers: 842_300, growth30d: 41_280, engagementRate: 0.052 },
  { platform: 'tiktok', followers: 612_400, growth30d: 88_710, engagementRate: 0.094 },
  { platform: 'douyin', followers: 504_100, growth30d: 63_200, engagementRate: 0.071 },
  { platform: 'facebook', followers: 318_900, growth30d: 7_420, engagementRate: 0.018 },
  { platform: 'xiaohongshu', followers: 287_600, growth30d: 39_950, engagementRate: 0.063 },
];

export const TOP_CREATORS: CreatorRow[] = [
  { rank: 1, handle: '@miawatkins', primaryPlatform: 'instagram', followers: 412_300, growth30d: 22_410, engagementRate: 0.058 },
  { rank: 2, handle: '@junhao.shoots', primaryPlatform: 'tiktok', followers: 388_900, growth30d: 41_220, engagementRate: 0.103 },
  { rank: 3, handle: '@cafeyumi', primaryPlatform: 'xiaohongshu', followers: 246_700, growth30d: 33_180, engagementRate: 0.078 },
  { rank: 4, handle: '@dailylift', primaryPlatform: 'tiktok', followers: 198_400, growth30d: 18_660, engagementRate: 0.091 },
  { rank: 5, handle: '@lin.moves', primaryPlatform: 'douyin', followers: 188_200, growth30d: 24_730, engagementRate: 0.082 },
  { rank: 6, handle: '@steady.frames', primaryPlatform: 'instagram', followers: 162_800, growth30d: 9_140, engagementRate: 0.046 },
  { rank: 7, handle: '@kang.eats', primaryPlatform: 'douyin', followers: 144_300, growth30d: 16_240, engagementRate: 0.069 },
  { rank: 8, handle: '@hellosora', primaryPlatform: 'instagram', followers: 121_900, growth30d: 6_810, engagementRate: 0.041 },
  { rank: 9, handle: '@notebookryo', primaryPlatform: 'instagram', followers: 108_400, growth30d: 5_220, engagementRate: 0.052 },
  { rank: 10, handle: '@wenyu.films', primaryPlatform: 'xiaohongshu', followers: 96_800, growth30d: 14_310, engagementRate: 0.071 },
  { rank: 11, handle: '@ramen.bookmark', primaryPlatform: 'tiktok', followers: 88_200, growth30d: 12_870, engagementRate: 0.098 },
  { rank: 12, handle: '@ailin.studio', primaryPlatform: 'douyin', followers: 81_400, growth30d: 11_240, engagementRate: 0.066 },
  { rank: 13, handle: '@chefdam', primaryPlatform: 'facebook', followers: 74_600, growth30d: 2_180, engagementRate: 0.022 },
  { rank: 14, handle: '@midnight.coding', primaryPlatform: 'tiktok', followers: 62_900, growth30d: 9_410, engagementRate: 0.087 },
  { rank: 15, handle: '@parking.lot.club', primaryPlatform: 'instagram', followers: 58_300, growth30d: 4_180, engagementRate: 0.049 },
  { rank: 16, handle: '@mochi.runs', primaryPlatform: 'xiaohongshu', followers: 47_100, growth30d: 6_820, engagementRate: 0.064 },
  { rank: 17, handle: '@goodform.life', primaryPlatform: 'facebook', followers: 41_800, growth30d: 1_910, engagementRate: 0.019 },
  { rank: 18, handle: '@inkscape.tw', primaryPlatform: 'instagram', followers: 36_200, growth30d: 2_640, engagementRate: 0.043 },
];

export const METRICS: Record<PlatformFilter, MetricView> = {
  all: {
    totalFollowers: 2_565_300,
    totalFollowersDeltaPct: 0.103,
    engagementRate: 0.061,
    engagementRateDelta: 0.008,
    activeCreators: 23,
    growthSeries: makeSeries(5200, 11800, 17),
    netGrowth30d: 240_560,
    netGrowth30dPct: 0.103,
  },
  instagram: {
    totalFollowers: 842_300,
    totalFollowersDeltaPct: 0.051,
    engagementRate: 0.052,
    engagementRateDelta: 0.004,
    activeCreators: 9,
    growthSeries: makeSeries(900, 2200, 53),
    netGrowth30d: 41_280,
    netGrowth30dPct: 0.051,
  },
  tiktok: {
    totalFollowers: 612_400,
    totalFollowersDeltaPct: 0.169,
    engagementRate: 0.094,
    engagementRateDelta: 0.012,
    activeCreators: 6,
    growthSeries: makeSeries(1800, 4400, 89),
    netGrowth30d: 88_710,
    netGrowth30dPct: 0.169,
  },
  facebook: {
    totalFollowers: 318_900,
    totalFollowersDeltaPct: 0.024,
    engagementRate: 0.018,
    engagementRateDelta: -0.002,
    activeCreators: 4,
    growthSeries: makeSeries(180, 360, 127),
    netGrowth30d: 7_420,
    netGrowth30dPct: 0.024,
  },
  douyin: {
    totalFollowers: 504_100,
    totalFollowersDeltaPct: 0.143,
    engagementRate: 0.071,
    engagementRateDelta: 0.009,
    activeCreators: 5,
    growthSeries: makeSeries(1300, 3100, 211),
    netGrowth30d: 63_200,
    netGrowth30dPct: 0.143,
  },
  xiaohongshu: {
    totalFollowers: 287_600,
    totalFollowersDeltaPct: 0.161,
    engagementRate: 0.063,
    engagementRateDelta: 0.007,
    activeCreators: 4,
    growthSeries: makeSeries(820, 1980, 347),
    netGrowth30d: 39_950,
    netGrowth30dPct: 0.161,
  },
};

/** Convert @handle to URL-safe slug used as /creators/[id] param. */
export function handleToSlug(handle: string): string {
  return handle.replace(/^@/, '').toLowerCase();
}

export function getCreatorsForFilter(filter: PlatformFilter): CreatorRow[] {
  if (filter === 'all') return TOP_CREATORS;
  return TOP_CREATORS
    .filter((c) => c.primaryPlatform === filter)
    .map((c, i) => ({ ...c, rank: i + 1 }));
}

export function getSortedCreators(
  filter: PlatformFilter,
  sortBy: LeaderboardSort
): CreatorRow[] {
  const base =
    filter === 'all'
      ? TOP_CREATORS
      : TOP_CREATORS.filter((c) => c.primaryPlatform === filter);
  const sorted = [...base].sort((a, b) => b[sortBy] - a[sortBy]);
  return sorted.map((c, i) => ({ ...c, rank: i + 1 }));
}

export interface LeaderboardSummary {
  trackedCreators: number;
  combinedFollowers: number;
  combinedGrowth30d: number;
  avgEngagementRate: number;
}

export function summarize(filter: PlatformFilter): LeaderboardSummary {
  const base =
    filter === 'all'
      ? TOP_CREATORS
      : TOP_CREATORS.filter((c) => c.primaryPlatform === filter);
  const trackedCreators = base.length;
  const combinedFollowers = base.reduce((acc, c) => acc + c.followers, 0);
  const combinedGrowth30d = base.reduce((acc, c) => acc + c.growth30d, 0);
  const avgEngagementRate =
    trackedCreators === 0
      ? 0
      : base.reduce((acc, c) => acc + c.engagementRate, 0) / trackedCreators;
  return { trackedCreators, combinedFollowers, combinedGrowth30d, avgEngagementRate };
}

export const compactFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 1,
});

export const exactFormatter = new Intl.NumberFormat('en-US');

export const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
});

export const signedPercentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
});
