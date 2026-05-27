/**
 * TikTok adapter — Apify Actor: clockworks/tiktok-scraper.
 * https://apify.com/clockworks/tiktok-scraper
 *
 * Input shape (per actor docs):
 *   profiles:          string[]   — profile URLs OR plain usernames
 *   resultsPerPage:    number     — we use 30 per spec (same window as IG)
 *   excludePinnedPosts: true      — keeps the "latest N" window honest;
 *                                    pinned old videos would distort the
 *                                    window's engagement totals.
 *
 * Output: each dataset item is a video with `authorMeta` nested object
 * carrying profile-level fields (followers, following, lifetime likes,
 * lifetime post count). First item is our source of truth for the profile
 * snapshot; every item maps to a post snapshot.
 *
 * Output mapping:
 *   Profile
 *     - total_posts:  authorMeta.video (lifetime)
 *     - total_likes:  authorMeta.heart (lifetime — unlike IG, TikTok exposes
 *                     this directly on the profile)
 *     - total_views:  sum of playCount across the fetched window (TikTok
 *                     does NOT expose a lifetime view count; this is a
 *                     window-total, document in UI per spec §6)
 *   Post
 *     - content_type: always 'short' (TikTok is short-form video)
 *     - shares:       shareCount (TikTok exposes this; IG does not)
 */

import { runActor } from '../apify-client';
import { ProfileNotFoundError, ProfilePrivateError } from '../errors';
import type {
  NormalizedPostSnapshot,
  NormalizedProfileSnapshot,
  PlatformAdapter,
  ScrapeResult,
} from '../types';

const ACTOR_ID = 'clockworks/tiktok-scraper';
const POSTS_PER_SCRAPE = 30;
const CAPTION_LIMIT = 280;

/** Profile-level fields nested under each video item's `authorMeta`. */
interface TtAuthorMeta {
  id?: string;
  name?: string;            // username (no @)
  nickName?: string | null;
  verified?: boolean;
  signature?: string | null;     // bio
  avatar?: string | null;
  profileUrl?: string;
  fans?: number | null;          // follower count
  following?: number | null;
  heart?: number | null;         // lifetime likes
  video?: number | null;         // lifetime post count
  privateAccount?: boolean;
}

/** Per-video metadata, including thumbnail. */
interface TtVideoMeta {
  /**
   * Thumbnail URL — always present, served by *.tiktokcdn.com or muscdn.
   * The actor does NOT return a direct videoUrl unless downloads are
   * requested, so this is the only media URL available without paying
   * for video file downloads.
   */
  coverUrl?: string | null;
  originalCoverUrl?: string | null;
  width?: number;
  height?: number;
  duration?: number;
}

/** Subset of fields we actually read from Apify's dataset item. */
interface TtItem {
  // Post-level
  id?: string;
  text?: string | null;
  webVideoUrl?: string;
  videoUrl?: string | null;       // only populated with shouldDownloadVideos
  videoMeta?: TtVideoMeta;
  createTime?: number | null;
  createTimeISO?: string | null;
  playCount?: number | null;
  diggCount?: number | null;      // likes
  shareCount?: number | null;
  commentCount?: number | null;
  collectCount?: number | null;
  // Parent profile
  authorMeta?: TtAuthorMeta;
  // Some payloads put a privacy flag at the top level too
  isPrivate?: boolean;
  // Error / empty markers some Apify actors set
  error?: string;
  errorDescription?: string;
}

function truncate(s: string | null | undefined, n: number): string | null {
  if (!s) return null;
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

function mapPost(item: TtItem): NormalizedPostSnapshot | null {
  const externalId = item.id;
  if (!externalId) return null;
  return {
    external_post_id: externalId,
    posted_at: item.createTimeISO ?? null,
    caption_excerpt: truncate(item.text, CAPTION_LIMIT),
    views: item.playCount ?? null,
    likes: item.diggCount ?? null,
    comments: item.commentCount ?? null,
    shares: item.shareCount ?? null,
    media_url: item.videoMeta?.coverUrl ?? item.videoUrl ?? null,
    content_type: 'short',
    raw: item,
  };
}

function mapProfile(
  first: TtItem,
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
  return {
    followers: author.fans ?? null,
    following: author.following ?? null,
    total_posts: author.video ?? null,
    total_views: viewsSeen ? totalViews : null,
    total_likes: author.heart ?? null,
    raw: {
      username: author.name,
      nickName: author.nickName,
      verified: author.verified,
      avatarUrl: author.avatar,
      biography: author.signature,
      sample_size: posts.length,
    },
  };
}

function isPrivate(item: TtItem): boolean {
  return !!(item.isPrivate || item.authorMeta?.privateAccount);
}

export const tiktokAdapter: PlatformAdapter = {
  platform: 'tiktok',
  actorId: ACTOR_ID,
  async scrape(profileUrl: string): Promise<ScrapeResult> {
    const items = await runActor<TtItem>({
      actorId: ACTOR_ID,
      platform: 'tiktok',
      profileUrl,
      input: {
        profiles: [profileUrl],
        resultsPerPage: POSTS_PER_SCRAPE,
        excludePinnedPosts: true,
      },
      timeoutSecs: 300,
    });

    // Inspect first item for error / state markers Apify embeds.
    const first = items[0];
    if (first?.error) {
      const msg = (first.errorDescription || first.error).toLowerCase();
      if (msg.includes('private')) {
        throw new ProfilePrivateError('tiktok', profileUrl);
      }
      if (
        msg.includes('not found') ||
        msg.includes('does not exist') ||
        msg.includes('no such user') ||
        msg.includes('couldn\'t find')
      ) {
        throw new ProfileNotFoundError('tiktok', profileUrl);
      }
    }
    if (first && isPrivate(first)) {
      throw new ProfilePrivateError('tiktok', profileUrl);
    }
    if (!first || !first.authorMeta?.name) {
      throw new ProfileNotFoundError('tiktok', profileUrl);
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
