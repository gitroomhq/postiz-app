/**
 * TikTok adapter — TikHub REST (api.tikhub.io/api/v1/tiktok/app/v3/...).
 *
 * Endpoints used:
 *   GET /api/v1/tiktok/app/v3/handler_user_profile?unique_id=<handle>
 *   GET /api/v1/tiktok/app/v3/fetch_user_post_videos_v3?unique_id=<handle>&count=30
 *
 * The "_v3" endpoints return the simplified TikTok app payload — same fields
 * as the full version but lighter / faster. Both endpoints accept unique_id
 * directly, so we don't need a sec_uid round-trip.
 *
 * Output mapping:
 *   Profile
 *     - followers:    user.follower_count
 *     - following:    user.following_count
 *     - total_posts:  user.aweme_count (lifetime, exposed by app API)
 *     - total_likes:  user.total_favorited (lifetime hearts received)
 *     - total_views:  sum of statistics.play_count across the fetched window
 *                     (TikTok does not expose a lifetime view total).
 *   Post
 *     - content_type: 'short' (TikTok is short-form video only)
 *     - shares:       statistics.share_count
 *
 * Migrated from Apify Actor clockworks/tiktok-scraper (2026-05-28).
 */

import { tikhubGet } from '../tikhub-client';
import { ProfileNotFoundError, ProfilePrivateError, ScrapeError } from '../errors';
import type {
  NormalizedPostSnapshot,
  NormalizedProfileSnapshot,
  PlatformAdapter,
  ScrapeResult,
} from '../types';

const PLATFORM = 'tiktok';
const POSTS_PER_SCRAPE = 30;
const CAPTION_LIMIT = 280;

/** Extract unique_id (no @) from a normalized tiktok.com URL. */
function extractHandle(profileUrl: string): string {
  const u = new URL(profileUrl);
  const m = u.pathname.match(/^\/@([A-Za-z0-9._]+)\/?$/);
  if (!m) {
    throw new ScrapeError(
      'failed',
      `Cannot extract TikTok handle from path "${u.pathname}"`,
      PLATFORM,
      profileUrl,
    );
  }
  return m[1];
}

interface TtUrlList {
  /** TikTok image/video URLs come as a list of CDN mirrors. */
  url_list?: string[];
}

interface TtUser {
  uid?: string;
  sec_uid?: string;
  unique_id?: string;
  nickname?: string | null;
  signature?: string | null;
  avatar_thumb?: TtUrlList;
  avatar_larger?: TtUrlList;
  avatar_medium?: TtUrlList;
  follower_count?: number | null;
  following_count?: number | null;
  aweme_count?: number | null;
  total_favorited?: number | null;
  verification_type?: number | null;
  custom_verify?: string | null;
  is_private_account?: boolean;
  /** Some responses use this name instead. */
  privacy_setting?: { private_account?: boolean };
}

interface TtProfileResponse {
  user?: TtUser;
  /** Some endpoints return the user at root. */
  uid?: string;
  unique_id?: string;
}

interface TtStatistics {
  play_count?: number | null;
  digg_count?: number | null;
  comment_count?: number | null;
  share_count?: number | null;
  collect_count?: number | null;
  download_count?: number | null;
}

interface TtVideo {
  cover?: TtUrlList;
  origin_cover?: TtUrlList;
  dynamic_cover?: TtUrlList;
  duration?: number;
  play_addr?: TtUrlList;
}

interface TtAweme {
  aweme_id?: string;
  desc?: string | null;
  create_time?: number | null;
  statistics?: TtStatistics;
  video?: TtVideo;
  /** Author is sometimes nested per-item (verify on smoke). */
  author?: TtUser;
}

interface TtPostsResponse {
  aweme_list?: TtAweme[];
  has_more?: number | boolean;
  max_cursor?: number | string;
}

function truncate(s: string | null | undefined, n: number): string | null {
  if (!s) return null;
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

function pickCover(v?: TtVideo): string | null {
  const lists = [v?.cover, v?.dynamic_cover, v?.origin_cover];
  for (const l of lists) {
    if (l?.url_list && l.url_list.length > 0) return l.url_list[0];
  }
  return null;
}

function pickAvatar(u: TtUser): string | null {
  const lists = [u.avatar_larger, u.avatar_medium, u.avatar_thumb];
  for (const l of lists) {
    if (l?.url_list && l.url_list.length > 0) return l.url_list[0];
  }
  return null;
}

function unwrapTimestamp(t: number | null | undefined): string | null {
  if (typeof t === 'number' && Number.isFinite(t)) {
    return new Date(t * 1000).toISOString();
  }
  return null;
}

function mapPost(a: TtAweme): NormalizedPostSnapshot | null {
  const externalId = a.aweme_id;
  if (!externalId) return null;
  const stats = a.statistics ?? {};
  return {
    external_post_id: externalId,
    posted_at: unwrapTimestamp(a.create_time),
    caption_excerpt: truncate(a.desc, CAPTION_LIMIT),
    views: stats.play_count ?? null,
    likes: stats.digg_count ?? null,
    comments: stats.comment_count ?? null,
    shares: stats.share_count ?? null,
    media_url: pickCover(a.video),
    content_type: 'short',
    raw: a,
  };
}

function unwrapUser(resp: TtProfileResponse): TtUser {
  return resp.user ?? (resp as unknown as TtUser);
}

function isPrivate(u: TtUser): boolean {
  return Boolean(u.is_private_account || u.privacy_setting?.private_account);
}

function mapProfile(
  user: TtUser,
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
    followers: user.follower_count ?? null,
    following: user.following_count ?? null,
    total_posts: user.aweme_count ?? null,
    total_views: viewsSeen ? totalViews : null,
    total_likes: user.total_favorited ?? null,
    raw: {
      uid: user.uid,
      sec_uid: user.sec_uid,
      unique_id: user.unique_id,
      nickname: user.nickname,
      verified: (user.verification_type ?? 0) > 0,
      avatar_url: pickAvatar(user),
      biography: user.signature,
      sample_size: posts.length,
    },
  };
}

export const tiktokAdapter: PlatformAdapter = {
  platform: 'tiktok',
  actorId: 'tikhub:tiktok/app/v3',
  async scrape(profileUrl: string): Promise<ScrapeResult> {
    const handle = extractHandle(profileUrl);

    const [profileResp, postsResp] = await Promise.all([
      tikhubGet<TtProfileResponse>({
        path: '/api/v1/tiktok/app/v3/handler_user_profile',
        query: { unique_id: handle },
        platform: PLATFORM,
        profileUrl,
      }),
      tikhubGet<TtPostsResponse>({
        path: '/api/v1/tiktok/app/v3/fetch_user_post_videos_v3',
        query: { unique_id: handle, count: POSTS_PER_SCRAPE, max_cursor: 0 },
        platform: PLATFORM,
        profileUrl,
      }).catch((err) => {
        // Private accounts often return profile fine but reject posts —
        // surface the profile shape with empty posts in that case.
        if (err instanceof ProfilePrivateError) return { aweme_list: [] } as TtPostsResponse;
        throw err;
      }),
    ]);

    const user = unwrapUser(profileResp);
    if (!user || (!user.uid && !user.sec_uid && !user.unique_id)) {
      throw new ProfileNotFoundError(PLATFORM, profileUrl);
    }
    if (isPrivate(user)) {
      throw new ProfilePrivateError(PLATFORM, profileUrl);
    }

    const posts: NormalizedPostSnapshot[] = [];
    for (const a of postsResp.aweme_list ?? []) {
      const mapped = mapPost(a);
      if (mapped) posts.push(mapped);
    }

    return {
      profile: mapProfile(user, posts),
      posts,
    };
  },
};
