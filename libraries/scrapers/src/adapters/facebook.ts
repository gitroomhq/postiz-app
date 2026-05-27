/**
 * Facebook adapter — Apify Actor: apify/facebook-posts-scraper.
 * https://apify.com/apify/facebook-posts-scraper
 *
 * Input shape (per actor docs):
 *   startUrls:     { url: string }[]  — public Facebook PAGE URLs only.
 *                                       Personal profiles are not supported by
 *                                       this actor (Apify documents this; we
 *                                       cannot work around it without going
 *                                       outside the "official actors only"
 *                                       rule).
 *   resultsLimit:  number              — we use 30 per spec, matching IG/TikTok.
 *                                       Without this set, the actor only
 *                                       returns the first page of posts.
 *
 * Output: each dataset item is one post. Items carry page identity fields
 * (pageName, facebookId, facebookUrl) and a nested `user` object — but
 * notably, this actor does NOT return lifetime page metrics: there is no
 * follower count, no page-likes total, and no lifetime post count anywhere
 * in the dataset. The sister actor `apify/facebook-pages-scraper` returns
 * those, but pinning to a single actor per platform is the spec rule. We
 * accept the gap and document it via null profile rollups.
 *
 * Output mapping:
 *   Profile
 *     - followers:    null (not exposed by this actor — see above)
 *     - following:    null (Facebook pages don't have a "following" concept)
 *     - total_posts:  null (not exposed by this actor)
 *     - total_views:  sum of viewsCount across the fetched window (video posts
 *                     only; photo posts have no view count). Window-total,
 *                     not lifetime — document in UI per spec §6.
 *     - total_likes:  sum of likes across the fetched window. Window-total,
 *                     not lifetime.
 *   Post
 *     - external_post_id: postId
 *     - posted_at:        time (already ISO 8601)
 *     - content_type:     'video' when any media entry is __typename 'Video'
 *                         OR when viewsCount is populated; otherwise 'image'.
 *                         FB doesn't have a "reel" or "short" concept that
 *                         this actor surfaces distinctly.
 *     - shares:           shares (FB exposes this; IG does not, TikTok does)
 *
 * Error handling: this actor does NOT document explicit error markers on
 * empty/private/missing pages — it returns zero items. apify-client.ts
 * already throws ApifyEmptyResultError on zero items, so adapters mostly
 * just guard against "first item missing the page identity" as a fallback
 * not_found signal. We still check first.error / first.errorDescription
 * defensively in case the actor adds them in a future build.
 */

import { runActor } from '../apify-client';
import { ProfileNotFoundError, ProfilePrivateError } from '../errors';
import type {
  ContentType,
  NormalizedPostSnapshot,
  NormalizedProfileSnapshot,
  PlatformAdapter,
  ScrapeResult,
} from '../types';

const ACTOR_ID = 'apify/facebook-posts-scraper';
const POSTS_PER_SCRAPE = 30;
const CAPTION_LIMIT = 280;

/** Nested page-owner object on each post item. */
interface FbUser {
  id?: string;
  name?: string;
  profileUrl?: string;
  profilePic?: string | null;
}

/**
 * One entry inside a post's `media` array. The actor uses GraphQL-style
 * `__typename` to discriminate Photo vs Video. We only read fields we
 * actually use — there's a lot more in the raw payload (resolutions,
 * accessibility captions, etc.) that we keep on `raw` for debugging.
 */
interface FbMedia {
  __typename?: string;
  thumbnail?: string | null;
  url?: string | null;
  photo_image?: { uri?: string | null } | null;
}

/** Subset of fields we actually read from Apify's dataset item. */
interface FbItem {
  // Post-level
  postId?: string;
  text?: string | null;
  url?: string;                  // direct post URL
  time?: string | null;          // ISO 8601 from the actor
  timestamp?: number | null;     // unix seconds, redundant fallback
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  viewsCount?: number | null;    // video posts only
  media?: FbMedia[];
  // Page identity (flat on each item)
  pageName?: string;
  facebookId?: string;
  facebookUrl?: string;
  user?: FbUser;
  // Defensive — not documented but adapters in IG/TikTok hit these in practice
  isPrivate?: boolean;
  error?: string;
  errorDescription?: string;
}

function truncate(s: string | null | undefined, n: number): string | null {
  if (!s) return null;
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

function pickContentType(item: FbItem): ContentType {
  const media = item.media ?? [];
  for (const m of media) {
    if ((m.__typename ?? '').toLowerCase() === 'video') return 'video';
  }
  // viewsCount is populated on video posts; if it's set but media lacked a
  // Video typename (some FB GraphQL responses do this), still call it video.
  if (typeof item.viewsCount === 'number' && item.viewsCount > 0) {
    return 'video';
  }
  // Default to image — covers single photo, carousel, link previews. FB
  // posts that are pure text will still hit this branch; that's acceptable
  // for v1 since 'text' isn't in the ContentType union and we'd otherwise
  // need to widen the type system for a single platform's edge case.
  return 'image';
}

function pickMediaUrl(item: FbItem): string | null {
  const first = item.media?.[0];
  if (!first) return null;
  // photo_image.uri is the canonical full-size image when present; thumbnail
  // is the always-present preview. url is the link the media points to
  // (often the same as photo_image.uri for photos, or the video file URL).
  return first.photo_image?.uri ?? first.thumbnail ?? first.url ?? null;
}

function mapPost(item: FbItem): NormalizedPostSnapshot | null {
  const externalId = item.postId;
  if (!externalId) return null;
  return {
    external_post_id: externalId,
    posted_at: item.time ?? null,
    caption_excerpt: truncate(item.text, CAPTION_LIMIT),
    views: item.viewsCount ?? null,
    likes: item.likes ?? null,
    comments: item.comments ?? null,
    shares: item.shares ?? null,
    media_url: pickMediaUrl(item),
    content_type: pickContentType(item),
    raw: item,
  };
}

function mapProfile(
  first: FbItem,
  posts: NormalizedPostSnapshot[],
): NormalizedProfileSnapshot {
  let totalViews = 0;
  let totalLikes = 0;
  let viewsSeen = false;
  let likesSeen = false;
  for (const p of posts) {
    if (p.views !== null) {
      totalViews += p.views;
      viewsSeen = true;
    }
    if (p.likes !== null) {
      totalLikes += p.likes;
      likesSeen = true;
    }
  }
  return {
    // Not exposed by apify/facebook-posts-scraper — see file-level JSDoc.
    followers: null,
    following: null,
    total_posts: null,
    total_views: viewsSeen ? totalViews : null,
    total_likes: likesSeen ? totalLikes : null,
    raw: {
      pageName: first.pageName ?? first.user?.name,
      facebookId: first.facebookId ?? first.user?.id,
      facebookUrl: first.facebookUrl ?? first.user?.profileUrl,
      profilePic: first.user?.profilePic,
      sample_size: posts.length,
    },
  };
}

export const facebookAdapter: PlatformAdapter = {
  platform: 'facebook',
  actorId: ACTOR_ID,
  async scrape(profileUrl: string): Promise<ScrapeResult> {
    const items = await runActor<FbItem>({
      actorId: ACTOR_ID,
      platform: 'facebook',
      profileUrl,
      input: {
        startUrls: [{ url: profileUrl }],
        resultsLimit: POSTS_PER_SCRAPE,
      },
      timeoutSecs: 300,
    });

    // Inspect first item for error / state markers Apify may embed. This
    // actor doesn't document them, but the IG and TikTok actors both do —
    // cheap to check defensively in case behavior aligns later.
    const first = items[0];
    if (first?.error) {
      const msg = (first.errorDescription || first.error).toLowerCase();
      if (msg.includes('private')) {
        throw new ProfilePrivateError('facebook', profileUrl);
      }
      if (
        msg.includes('not found') ||
        msg.includes('does not exist') ||
        msg.includes('unavailable')
      ) {
        throw new ProfileNotFoundError('facebook', profileUrl);
      }
    }
    if (first?.isPrivate) {
      throw new ProfilePrivateError('facebook', profileUrl);
    }
    // No page identity at all = treat as not_found. apify-client already
    // threw ApifyEmptyResultError if items.length === 0, so reaching here
    // means we got items but they're shaped wrong.
    if (!first || (!first.pageName && !first.user?.name && !first.facebookId)) {
      throw new ProfileNotFoundError('facebook', profileUrl);
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
