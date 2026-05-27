/**
 * Douyin (抖音) adapter — Apify Actor: zen-studio/douyin-profile-scraper.
 * https://apify.com/zen-studio/douyin-profile-scraper
 *
 * Douyin is the mainland-China app from ByteDance — DIFFERENT product from
 * international TikTok (different domain douyin.com, different content,
 * different APIs). The clockworks/tiktok-scraper used for `tiktok` will
 * NOT work here.
 *
 * Actor choice rationale: Apify does not publish a first-party Douyin
 * scraper. `zen-studio/douyin-profile-scraper` is the closest analogue to
 * `clockworks/tiktok-scraper` — purpose-built for profile + recent posts,
 * with engagement metrics and follower counts. Sibling actors from the same
 * publisher (douyin-video-scraper, douyin-comments-scraper) signal active
 * maintenance. Output shape mirrors TikTok's `authorMeta` nesting pattern.
 *
 * Input shape (per actor docs, verified 2026-05-28):
 *   profileUrls:        string[]  — browser URLs, app share links, secUids,
 *                                    or numeric IDs all accepted
 *   maxPostsPerProfile: number    — 0 = profile-only, else recent N posts
 *   excludePinnedPosts: true      — keep the "latest N" window honest
 *                                    (same rationale as TikTok adapter)
 *
 * Output: dataset of post items, each carrying nested `authorMeta` with
 * profile-level fields. First item is the source of truth for the profile
 * snapshot; every item maps to a post snapshot. Engagement counts live
 * under each item's nested `statistics` object (NOT top-level — this is
 * the main shape divergence from TikTok).
 *
 * Output mapping:
 *   Profile
 *     - total_posts:  authorMeta.awemeCount (lifetime)
 *     - total_likes:  authorMeta.totalLikesReceived (lifetime — Douyin
 *                     exposes this on the profile, like TikTok's heart)
 *     - total_views:  sum of statistics.playCount across the fetched
 *                     window. Douyin does NOT expose a lifetime view
 *                     count on the profile; this is a window-total,
 *                     document in UI per spec §6.
 *   Post
 *     - content_type: always 'short' (Douyin is short-form video)
 *     - shares:       statistics.shareCount
 */

import { runActor } from '../apify-client';
import { ProfileNotFoundError, ProfilePrivateError } from '../errors';
import type {
  NormalizedPostSnapshot,
  NormalizedProfileSnapshot,
  PlatformAdapter,
  ScrapeResult,
} from '../types';

const ACTOR_ID = 'zen-studio/douyin-profile-scraper';
const POSTS_PER_SCRAPE = 30;
const CAPTION_LIMIT = 280;

/** Profile-level fields nested under each post item's `authorMeta`. */
interface DyAuthorMeta {
  id?: string;
  secUid?: string;
  name?: string | null;            // display name / nickname
  username?: string | null;        // @handle (may be empty)
  customUsername?: string | null;
  verified?: boolean;
  verifyType?: string | null;
  signature?: string | null;       // bio
  avatarLarge?: string | null;
  avatarMedium?: string | null;
  avatarThumb?: string | null;
  followersCount?: number | null;
  followingCount?: number | null;
  /** Lifetime likes received across all of the author's posts. */
  totalLikesReceived?: number | null;
  /** Sometimes-present legacy alias for totalLikesReceived. */
  heartCount?: number | null;
  /** Lifetime post count — README calls awemeCount the "real total". */
  awemeCount?: number | null;
  /** Older actor builds returned videoCount; keep as fallback. */
  videoCount?: number | null;
  ipLocation?: string | null;
  country?: string | null;
  isLiving?: boolean;
}

/** Per-post engagement counts — Douyin nests these (unlike TikTok). */
interface DyStatistics {
  diggCount?: number | null;       // likes (点赞)
  commentCount?: number | null;    // comments (评论)
  shareCount?: number | null;      // shares (分享)
  collectCount?: number | null;    // saves / favorites
  downloadCount?: number | null;
  playCount?: number | null;       // views (播放)
  forwardCount?: number | null;
}

/** Video media metadata — covers + (optional) playable URLs. */
interface DyVideoMeta {
  cover?: string | null;
  originCover?: string | null;
  dynamicCover?: string | null;
  /** Only populated when downloads are requested; we don't request them. */
  playUrl?: string | null;
  downloadUrl?: string | null;
  duration?: number;
  width?: number;
  height?: number;
}

/** Subset of fields we actually read from Apify's dataset item. */
interface DyItem {
  // Post-level
  id?: string;
  type?: string | null;            // 'video' | 'imageText' | 'story'
  text?: string | null;            // caption
  url?: string;
  shareUrl?: string;
  /** Top-level thumbnail URL — always present per README. */
  thumb?: string | null;
  images?: string[];
  createTime?: number | null;      // unix seconds
  createDate?: string | null;      // ISO
  statistics?: DyStatistics;
  videoMeta?: DyVideoMeta;
  // Parent profile
  authorMeta?: DyAuthorMeta;
  // Error / state markers some Apify actors set
  error?: string;
  errorDescription?: string;
}

function truncate(s: string | null | undefined, n: number): string | null {
  if (!s) return null;
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

function mapPost(item: DyItem): NormalizedPostSnapshot | null {
  const externalId = item.id;
  if (!externalId) return null;
  const stats = item.statistics ?? {};
  return {
    external_post_id: externalId,
    posted_at: item.createDate ?? null,
    caption_excerpt: truncate(item.text, CAPTION_LIMIT),
    views: stats.playCount ?? null,
    likes: stats.diggCount ?? null,
    comments: stats.commentCount ?? null,
    shares: stats.shareCount ?? null,
    media_url: item.thumb ?? item.videoMeta?.cover ?? null,
    content_type: 'short',
    raw: item,
  };
}

function mapProfile(
  first: DyItem,
  posts: NormalizedPostSnapshot[],
): NormalizedProfileSnapshot {
  const author = first.authorMeta ?? {};
  let totalViews = 0;
  let viewsSeen = false;
  for (const p of posts) {
    if (p.views !== null) {
      totalViews += p.views;
      viewsSeen = true;
    }
  }
  // Prefer the documented field; fall back to legacy aliases that older
  // actor builds returned.
  const totalPosts = author.awemeCount ?? author.videoCount ?? null;
  const totalLikes = author.totalLikesReceived ?? author.heartCount ?? null;
  return {
    followers: author.followersCount ?? null,
    following: author.followingCount ?? null,
    total_posts: totalPosts,
    total_views: viewsSeen ? totalViews : null,
    total_likes: totalLikes,
    raw: {
      secUid: author.secUid,
      username: author.username,
      nickname: author.name,
      verified: author.verified,
      avatarUrl: author.avatarLarge,
      biography: author.signature,
      ipLocation: author.ipLocation,
      sample_size: posts.length,
    },
  };
}

export const douyinAdapter: PlatformAdapter = {
  platform: 'douyin',
  actorId: ACTOR_ID,
  async scrape(profileUrl: string): Promise<ScrapeResult> {
    const items = await runActor<DyItem>({
      actorId: ACTOR_ID,
      platform: 'douyin',
      profileUrl,
      input: {
        profileUrls: [profileUrl],
        maxPostsPerProfile: POSTS_PER_SCRAPE,
        excludePinnedPosts: true,
      },
      timeoutSecs: 300,
    });

    // Inspect first item for error / state markers Apify embeds. Per the
    // actor README, private accounts and blocked profiles "are not
    // addressable" — there's no documented isPrivate flag, so we match on
    // error message text (consistent with the TikTok adapter pattern).
    const first = items[0];
    if (first?.error) {
      const msg = (first.errorDescription || first.error).toLowerCase();
      if (msg.includes('private') || msg.includes('restricted')) {
        throw new ProfilePrivateError('douyin', profileUrl);
      }
      if (
        msg.includes('not found') ||
        msg.includes('does not exist') ||
        msg.includes('no such user') ||
        msg.includes("couldn't find") ||
        msg.includes('invalid')
      ) {
        throw new ProfileNotFoundError('douyin', profileUrl);
      }
    }
    if (!first || !first.authorMeta?.secUid) {
      throw new ProfileNotFoundError('douyin', profileUrl);
    }

    const posts: NormalizedPostSnapshot[] = [];
    for (const it of items) {
      const p = mapPost(it);
      if (p) posts.push(p);
    }

    return {
      profile: mapProfile(first, posts),
      posts,
    };
  },
};
