/**
 * Facebook adapter — Bright Data Web Scraper API.
 *
 * Datasets used (Bright Data prebuilt collectors):
 *   - Facebook profile by URL: gd_lkay758p1eanlolqw8
 *       Exposes followers / page_likes / post_count / verified / category /
 *       intro / profile_pic — fields the previous Apify actor did NOT.
 *   - Facebook posts by URL:   gd_lkaxegm826bjpoo9m5fd
 *       Latest N posts per profile URL with likes / comments / shares /
 *       views / attachments / timestamp.
 *
 * Both datasets run in parallel via runDataset (trigger → poll → snapshot).
 * 5-minute budget total, 5s poll — matches Vercel Function maxDuration.
 *
 * Output mapping:
 *   Profile (from gd_lkay758p1eanlolqw8 first item)
 *     - followers:    followers (LIVE — was null on Apify)
 *     - following:    null (FB pages don't have a following concept)
 *     - total_posts:  posts_count (LIVE — was null on Apify)
 *     - total_likes:  likes (lifetime page likes — LIVE)
 *     - total_views:  sum of num_views across the post window (lifetime
 *                     view total is not exposed; window-only per spec §6)
 *   Post (from gd_lkaxegm826bjpoo9m5fd items)
 *     - content_type: 'video' if has_video / video_view_count > 0, else 'image'
 *     - shares:       shares (FB exposes; IG does not, TikTok does)
 *
 * Migrated from Apify Actor apify/facebook-posts-scraper (2026-05-28).
 */

import { runDataset } from '../brightdata-client';
import { ProfileNotFoundError, ProfilePrivateError } from '../errors';
import type {
  ContentType,
  NormalizedPostSnapshot,
  NormalizedProfileSnapshot,
  PlatformAdapter,
  ScrapeResult,
} from '../types';

const PLATFORM = 'facebook';
const PROFILE_DATASET_ID = 'gd_lkay758p1eanlolqw8';
const POSTS_DATASET_ID = 'gd_lkaxegm826bjpoo9m5fd';
const POSTS_PER_SCRAPE = 30;
const CAPTION_LIMIT = 280;

/** Bright Data FB profile item (gd_lkay758p1eanlolqw8). */
interface BdFbProfile {
  url?: string;
  id?: string;
  page_name?: string | null;
  name?: string | null;
  /** Lifetime page followers. */
  followers?: number | null;
  /** Lifetime page likes (the "likes" counter, distinct from per-post likes). */
  likes?: number | null;
  /** Lifetime post count on the page. */
  posts_count?: number | null;
  intro?: string | null;
  profile_pic?: string | null;
  profile_picture_url?: string | null;
  cover_picture_url?: string | null;
  category?: string | null;
  verified?: boolean;
  is_business_page?: boolean;
  /** BD sets these on failed collections. */
  error?: string;
  warning?: string;
}

/** Bright Data FB post item (gd_lkaxegm826bjpoo9m5fd). */
interface BdFbPost {
  url?: string;
  post_id?: string;
  user_url?: string;
  user_username_raw?: string;
  content?: string | null;
  /** ISO 8601 timestamp. */
  date_posted?: string | null;
  timestamp?: string | null;
  num_comments?: number | null;
  num_shares?: number | null;
  num_likes_type?: { type?: string; num?: number }[];
  /** Aggregate likes — sometimes 'likes', sometimes 'num_likes'. */
  likes?: number | null;
  num_likes?: number | null;
  /** Video view count (videos only). */
  num_views?: number | null;
  video_view_count?: number | null;
  has_video?: boolean;
  attachments?: Array<{ type?: string; url?: string; thumbnail?: string }>;
  thumbnail?: string | null;
  /** BD per-row error marker. */
  error?: string;
  warning?: string;
}

function truncate(s: string | null | undefined, n: number): string | null {
  if (!s) return null;
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

function pickContentType(p: BdFbPost): ContentType {
  if (p.has_video || (p.video_view_count ?? p.num_views ?? 0) > 0) return 'video';
  const attTypes = (p.attachments ?? []).map((a) => (a.type ?? '').toLowerCase());
  if (attTypes.includes('video')) return 'video';
  return 'image';
}

function pickMediaUrl(p: BdFbPost): string | null {
  if (p.thumbnail) return p.thumbnail;
  const first = p.attachments?.[0];
  if (!first) return null;
  return first.thumbnail ?? first.url ?? null;
}

function pickLikes(p: BdFbPost): number | null {
  if (typeof p.likes === 'number') return p.likes;
  if (typeof p.num_likes === 'number') return p.num_likes;
  // Aggregate the typed likes array if present.
  const arr = p.num_likes_type;
  if (Array.isArray(arr) && arr.length > 0) {
    return arr.reduce((sum, e) => sum + (typeof e.num === 'number' ? e.num : 0), 0);
  }
  return null;
}

function mapPost(p: BdFbPost): NormalizedPostSnapshot | null {
  const externalId = p.post_id;
  if (!externalId) return null;
  return {
    external_post_id: externalId,
    posted_at: p.date_posted ?? p.timestamp ?? null,
    caption_excerpt: truncate(p.content, CAPTION_LIMIT),
    views: p.video_view_count ?? p.num_views ?? null,
    likes: pickLikes(p),
    comments: p.num_comments ?? null,
    shares: p.num_shares ?? null,
    media_url: pickMediaUrl(p),
    content_type: pickContentType(p),
    raw: p,
  };
}

function mapProfile(
  prof: BdFbProfile,
  posts: NormalizedPostSnapshot[],
): NormalizedProfileSnapshot {
  let totalViews = 0;
  let viewsSeen = false;
  for (const p of posts) {
    if (p.views !== null) {
      totalViews += p.views;
      viewsSeen = true;
    }
  }
  return {
    followers: prof.followers ?? null,
    following: null, // FB pages have no following counter
    total_posts: prof.posts_count ?? null,
    total_views: viewsSeen ? totalViews : null,
    // Bright Data exposes the lifetime page-likes counter — prefer it over
    // window-sum which the prior Apify adapter had to fall back to.
    total_likes: prof.likes ?? null,
    raw: {
      facebook_id: prof.id,
      page_name: prof.page_name ?? prof.name,
      profile_pic: prof.profile_pic ?? prof.profile_picture_url ?? null,
      cover_picture_url: prof.cover_picture_url,
      category: prof.category,
      verified: prof.verified ?? null,
      intro: prof.intro,
      sample_size: posts.length,
    },
  };
}

function isPrivate(p: BdFbProfile): boolean {
  const msg = (p.error || p.warning || '').toLowerCase();
  return msg.includes('private') || msg.includes('restricted') || msg.includes('login required');
}

function isNotFound(p: BdFbProfile): boolean {
  const msg = (p.error || p.warning || '').toLowerCase();
  return msg.includes('not found') || msg.includes('does not exist') || msg.includes('404');
}

export const facebookAdapter: PlatformAdapter = {
  platform: 'facebook',
  // Kept for backward compat with the type — Bright Data has no Actor IDs;
  // tagged with the profile dataset for traceability.
  actorId: `brightdata:${PROFILE_DATASET_ID}`,
  async scrape(profileUrl: string): Promise<ScrapeResult> {
    const [profileItems, postItems] = await Promise.all([
      runDataset<BdFbProfile>({
        datasetId: PROFILE_DATASET_ID,
        inputs: [{ url: profileUrl }],
        platform: PLATFORM,
        profileUrl,
      }),
      runDataset<BdFbPost>({
        datasetId: POSTS_DATASET_ID,
        inputs: [{ url: profileUrl, num_of_posts: POSTS_PER_SCRAPE }],
        platform: PLATFORM,
        profileUrl,
      }).catch((err) => {
        // Posts collector can return private/not_found independently of the
        // profile collector — degrade gracefully and let the profile half
        // decide the canonical status.
        if (err instanceof ProfilePrivateError) return [] as BdFbPost[];
        if (err instanceof ProfileNotFoundError) return [] as BdFbPost[];
        throw err;
      }),
    ]);

    const first = profileItems[0];
    if (!first) {
      throw new ProfileNotFoundError(PLATFORM, profileUrl);
    }
    if (isPrivate(first)) {
      throw new ProfilePrivateError(PLATFORM, profileUrl);
    }
    if (isNotFound(first)) {
      throw new ProfileNotFoundError(PLATFORM, profileUrl);
    }
    // No page identity at all = treat as not_found.
    if (!first.id && !first.page_name && !first.name && !first.url) {
      throw new ProfileNotFoundError(PLATFORM, profileUrl);
    }

    const posts: NormalizedPostSnapshot[] = [];
    for (const p of postItems) {
      const mapped = mapPost(p);
      if (mapped) posts.push(mapped);
    }

    return {
      profile: mapProfile(first, posts),
      posts,
    };
  },
};
