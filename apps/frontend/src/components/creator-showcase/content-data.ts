import type { PlatformKey } from '../ui/platform-icons';

export type ContentType =
  | 'image'
  | 'video'
  | 'reel'
  | 'carousel'
  | 'note'
  | 'text';

export interface ContentMetrics {
  likes: number;
  comments: number;
  shares: number;
  views: number | null;
  saves: number | null;
}

export interface ContentPost {
  id: string;
  creatorSlug: string;
  platform: PlatformKey;
  externalId: string;
  /** Original post URL on the platform */
  url: string;
  type: ContentType;
  thumbnailUrl: string | null;
  /** Short muted MP4 (~480p, 5-10s) for hover preview. Null for non-video posts. */
  previewVideoUrl: string | null;
  caption: string;
  hashtags: string[];
  /** ISO timestamp */
  publishedAt: string;
  metrics: ContentMetrics;
  /** Carousel size, null otherwise */
  mediaCount: number | null;
  /** Video length in seconds, null otherwise */
  durationSec: number | null;
}

export type SortKey = 'recent' | 'likes' | 'comments' | 'views';

/** Aspect class per platform — IG/FB square, TikTok/Douyin portrait 9:16, XHS 3:4 */
export const PLATFORM_ASPECT: Record<PlatformKey, string> = {
  instagram: 'aspect-square',
  facebook: 'aspect-square',
  tiktok: 'aspect-[9/16]',
  douyin: 'aspect-[9/16]',
  xiaohongshu: 'aspect-[3/4]',
};

/** Picsum thumbnail dimensions per platform */
const THUMB_DIMENSIONS: Record<PlatformKey, [number, number]> = {
  instagram: [600, 600],
  facebook: [600, 600],
  tiktok: [360, 640],
  douyin: [360, 640],
  xiaohongshu: [480, 640],
};

/** Stable public sample MP4s (Google sample bucket — CORS-friendly, autoplay-safe) */
const SAMPLE_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
];

/** Type mix per platform — controls what kinds of posts a creator publishes */
const PLATFORM_TYPE_MIX: Record<PlatformKey, ContentType[]> = {
  instagram: ['image', 'image', 'reel', 'reel', 'reel', 'carousel', 'image', 'video', 'image', 'reel'],
  facebook: ['image', 'image', 'video', 'carousel', 'image', 'text', 'video', 'image', 'image', 'carousel'],
  tiktok: ['video', 'video', 'video', 'video', 'video', 'video', 'video', 'video', 'video', 'video'],
  douyin: ['video', 'video', 'video', 'video', 'video', 'video', 'video', 'video', 'video', 'video'],
  xiaohongshu: ['note', 'note', 'note', 'carousel', 'note', 'note', 'carousel', 'note', 'note', 'carousel'],
};

const CAPTION_BANK: Record<PlatformKey, string[]> = {
  instagram: [
    'Morning light hitting just right. New series dropping this week.',
    'Behind the scenes from yesterday\'s shoot — long day, worth every minute.',
    'Three tries to nail the framing. Hope you like the result.',
    'Saved this corner of the city for a quieter shot. Tag me if you find it.',
    'Test roll back from the lab. Grain hits different.',
  ],
  facebook: [
    'Quick recap from the weekend — full thread coming Friday.',
    'Big announcement on Monday. Stay tuned.',
    'Throwback to last summer\'s trip. Already planning the next one.',
    'New project just shipped — link in the first comment.',
  ],
  tiktok: [
    'POV: you finally finish the deadlift PR you\'ve been chasing for months',
    'this trend but with a twist 🤝 watch till the end',
    'how to NOT fold under pressure — saving this for myself fr',
    'spent 3 hours editing this for a 12 second video and I\'d do it again',
    'okay but tutorial #4 in this series is unhinged',
  ],
  douyin: [
    '今日份的练习 · 一镜到底 没ng',
    '这个角度第一次拍到 太满意了',
    '试了五种light setup 最后选了最暗那个',
    '后期只调了色温 其他全部素材',
  ],
  xiaohongshu: [
    '今天去的café | 拿铁8/10 环境10/10 推荐窗边靠墙的位置',
    '本月护肤分享 · 油痘肌 实测一个月的对比',
    '小众配色测试 · 这套穿搭意外好评',
    '复盘 | 这家店第三次去了 还是同样推荐',
  ],
};

const HASHTAG_BANK: Record<PlatformKey, string[][]> = {
  instagram: [
    ['photography', 'film', 'mood'],
    ['portrait', 'natural', 'streetstyle'],
    ['everyday', 'shotoniphone', 'minimal'],
  ],
  facebook: [
    ['weekend', 'community', 'update'],
    ['announcement', 'thanks'],
    ['behindthescenes'],
  ],
  tiktok: [
    ['fyp', 'fitness', 'tutorial'],
    ['comedy', 'pov', 'storytime'],
    ['lifehack', 'tip', 'real'],
  ],
  douyin: [
    ['日常', '记录', 'vlog'],
    ['挑战', '原创', '幕后'],
    ['教程', '分享'],
  ],
  xiaohongshu: [
    ['咖啡探店', '城市指南', '小众好店'],
    ['日常分享', '美妆护肤', '油痘肌'],
    ['穿搭', '配色灵感', '小个子穿搭'],
  ],
};

/** Deterministic PRNG from string seed */
function makeRng(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

const PLATFORM_BASE_URLS: Record<PlatformKey, string> = {
  instagram: 'https://www.instagram.com/p/',
  facebook: 'https://www.facebook.com/posts/',
  tiktok: 'https://www.tiktok.com/@user/video/',
  douyin: 'https://www.douyin.com/video/',
  xiaohongshu: 'https://www.xiaohongshu.com/explore/',
};

function buildExternalId(rng: () => number): string {
  return Array.from({ length: 11 }, () =>
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_'[
      Math.floor(rng() * 64)
    ]
  ).join('');
}

/**
 * Generate deterministic mock posts for a creator on a platform.
 * Replace with `useSWR('/api/creators/[slug]/content?platform=...')` when backend lands.
 */
export function getCreatorPosts(
  creatorSlug: string,
  platform: PlatformKey,
  count = 24
): ContentPost[] {
  const rng = makeRng(`${creatorSlug}:${platform}`);
  const [w, h] = THUMB_DIMENSIONS[platform];
  const typeMix = PLATFORM_TYPE_MIX[platform];
  const captions = CAPTION_BANK[platform];
  const hashtagSets = HASHTAG_BANK[platform];
  const baseUrl = PLATFORM_BASE_URLS[platform];
  const now = Date.now();

  return Array.from({ length: count }, (_, i): ContentPost => {
    const type = pick(rng, typeMix);
    const hasVideo = type === 'video' || type === 'reel';
    const externalId = buildExternalId(rng);
    const baseLikes = Math.floor(rng() * 80_000) + 2_000;
    const viewsMult = 8 + Math.floor(rng() * 25);
    const seed = `${creatorSlug}-${platform}-${i}`;
    // Posts spread across last 90 days, decaying density toward older
    const daysAgo = Math.floor(Math.pow(rng(), 1.5) * 90);
    const publishedAt = new Date(now - daysAgo * 86_400_000).toISOString();
    const mediaCount = type === 'carousel' ? 2 + Math.floor(rng() * 6) : null;
    const durationSec = hasVideo ? 6 + Math.floor(rng() * 54) : null;

    return {
      id: `${creatorSlug}-${platform}-${i}`,
      creatorSlug,
      platform,
      externalId,
      url: `${baseUrl}${externalId}`,
      type,
      thumbnailUrl:
        type === 'text'
          ? null
          : `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`,
      previewVideoUrl: hasVideo
        ? SAMPLE_VIDEOS[Math.floor(rng() * SAMPLE_VIDEOS.length)]
        : null,
      caption: pick(rng, captions),
      hashtags: pick(rng, hashtagSets),
      publishedAt,
      metrics: {
        likes: baseLikes,
        comments: Math.floor(baseLikes * (0.02 + rng() * 0.08)),
        shares: Math.floor(baseLikes * (0.01 + rng() * 0.04)),
        views: hasVideo ? baseLikes * viewsMult : null,
        saves: platform === 'instagram' || platform === 'xiaohongshu'
          ? Math.floor(baseLikes * (0.05 + rng() * 0.12))
          : null,
      },
      mediaCount,
      durationSec,
    };
  });
}

// --- Formatters -----------------------------------------------------------

const compactFmt = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 1,
});

export function formatCompact(n: number): string {
  return compactFmt.format(n);
}

export function formatDuration(sec: number | null): string {
  if (sec == null) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Display label for a post's headline metric — views for video, likes otherwise */
export function formatPrimaryMetric(post: ContentPost): { label: string; value: string } {
  if (post.metrics.views != null) {
    return { label: 'views', value: formatCompact(post.metrics.views) };
  }
  return { label: 'likes', value: formatCompact(post.metrics.likes) };
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return `${diffSec}s`;
  const m = Math.floor(diffSec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w`;
  const mo = Math.floor(d / 30);
  return `${mo}mo`;
}
