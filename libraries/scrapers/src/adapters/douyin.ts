/**
 * Douyin adapter — TikHub REST (api.tikhub.io/api/v1/douyin/web/...).
 *
 * Endpoints used:
 *   GET /api/v1/douyin/web/handler_user_profile?sec_user_id=<sec_uid>
 *   GET /api/v1/douyin/web/fetch_user_post_videos?sec_user_id=<sec_uid>&count=30
 *
 * Douyin is the mainland-China ByteDance app — different product from
 * international TikTok (different domain douyin.com, different APIs). Both
 * web endpoints accept the sec_uid that lives in the profile URL path
 * (douyin.com/user/<sec_uid>) so we don't need an extra lookup.
 *
 * Output mapping:
 *   Profile
 *     - followers:    user.follower_count
 *     - following:    user.following_count
 *     - total_posts:  user.aweme_count (lifetime)
 *     - total_likes:  user.total_favorited (lifetime — Douyin exposes this on
 *                     the profile, unlike TikTok which only exposes via app v3)
 *     - total_views:  sum of statistics.play_count across the fetched window
 *                     (Douyin does NOT expose a lifetime view count).
 *   Post
 *     - content_type: 'short' (Douyin is short-form video only)
 *     - shares:       statistics.share_count
 *
 * Migrated from Apify Actor zen-studio/douyin-profile-scraper (2026-05-28).
 */

import { tikhubGet } from '../tikhub-client';
import { ProfileNotFoundError, ScrapeError } from '../errors';
import type {
  NormalizedPostSnapshot,
  NormalizedProfileSnapshot,
  PlatformAdapter,
  ScrapeResult,
} from '../types';

const PLATFORM = 'douyin';
const POSTS_PER_SCRAPE = 30;
const CAPTION_LIMIT = 280;

/** Extract sec_uid from a normalized douyin.com URL: /user/<sec_uid>. */
function extractSecUid(profileUrl: string): string {
  const u = new URL(profileUrl);
  const m = u.pathname.match(/^\/user\/([A-Za-z0-9_-]+)\/?$/);
  if (!m) {
    throw new ScrapeError(
      'failed',
      `Cannot extract Douyin sec_uid from path "${u.pathname}"`,
      PLATFORM,
      profileUrl,
    );
  }
  return m[1];
}

interface DyUrlList {
  url_list?: string[];
}

interface DyUser {
  uid?: string;
  sec_uid?: string;
  short_id?: string;
  unique_id?: string;
  nickname?: string | null;
  signature?: string | null;
  avatar_thumb?: DyUrlList;
  avatar_larger?: DyUrlList;
  avatar_medium?: DyUrlList;
  follower_count?: number | null;
  following_count?: number | null;
  aweme_count?: number | null;
  total_favorited?: number | null;
  custom_verify?: string | null;
  ip_location?: string | null;
}

interface DyProfileResponse {
  user?: DyUser;
  uid?: string;
  sec_uid?: string;
}

interface DyStatistics {
  play_count?: number | null;
  digg_count?: number | null;
  comment_count?: number | null;
  share_count?: number | null;
  collect_count?: number | null;
  forward_count?: number | null;
}

interface DyVideo {
  cover?: DyUrlList;
  origin_cover?: DyUrlList;
  dynamic_cover?: DyUrlList;
  duration?: number;
}

interface DyAweme {
  aweme_id?: string;
  desc?: string | null;
  create_time?: number | null;
  statistics?: DyStatistics;
  video?: DyVideo;
}

interface DyPostsResponse {
  aweme_list?: DyAweme[];
  has_more?: number | boolean;
  max_cursor?: number | string;
}

function truncate(s: string | null | undefined, n: number): string | null {
  if (!s) return null;
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

function pickCover(v?: DyVideo): string | null {
  const lists = [v?.cover, v?.dynamic_cover, v?.origin_cover];
  for (const l of lists) {
    if (l?.url_list && l.url_list.length > 0) return l.url_list[0];
  }
  return null;
}

function pickAvatar(u: DyUser): string | null {
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

function mapPost(a: DyAweme): NormalizedPostSnapshot | null {
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

function unwrapUser(resp: DyProfileResponse): DyUser {
  return resp.user ?? (resp as unknown as DyUser);
}

function mapProfile(
  user: DyUser,
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
      short_id: user.short_id,
      unique_id: user.unique_id,
      nickname: user.nickname,
      verified: Boolean(user.custom_verify),
      avatar_url: pickAvatar(user),
      biography: user.signature,
      ip_location: user.ip_location,
      sample_size: posts.length,
    },
  };
}

export const douyinAdapter: PlatformAdapter = {
  platform: 'douyin',
  actorId: 'tikhub:douyin/web',
  async scrape(profileUrl: string): Promise<ScrapeResult> {
    const secUid = extractSecUid(profileUrl);

    const [profileResp, postsResp] = await Promise.all([
      tikhubGet<DyProfileResponse>({
        path: '/api/v1/douyin/web/handler_user_profile',
        query: { sec_user_id: secUid },
        platform: PLATFORM,
        profileUrl,
      }),
      tikhubGet<DyPostsResponse>({
        path: '/api/v1/douyin/web/fetch_user_post_videos',
        query: { sec_user_id: secUid, count: POSTS_PER_SCRAPE, max_cursor: '0' },
        platform: PLATFORM,
        profileUrl,
      }),
    ]);

    const user = unwrapUser(profileResp);
    if (!user || (!user.sec_uid && !user.uid)) {
      throw new ProfileNotFoundError(PLATFORM, profileUrl);
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
