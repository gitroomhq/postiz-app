/**
 * Instagram adapter — Apify Actor: apify/instagram-scraper.
 * https://apify.com/apify/instagram-scraper
 *
 * Input shape (verified live 2026-05-27, build 0.0.613):
 *   directUrls:     string[]  — profile URLs
 *   resultsType:    'posts'   — gets last N posts
 *   resultsLimit:   number    — we use 30 per spec
 *   addParentData:  true      — appends profile-level fields to each post item
 *
 * Output: dataset of post items, each carrying both post fields AND parent
 * profile fields (username/followersCount/etc). First item is our source of
 * truth for the profile snapshot; all items map to post snapshots.
 *
 * Note: IG does not expose lifetime totals via the public profile page.
 *  - total_posts:  null  (not in this actor's output — would need separate scrape)
 *  - total_views:  sum of videoViewCount across the fetched window
 *  - total_likes:  sum of likesCount across the fetched window
 * These are window-totals, not platform-lifetime. Document in UI per spec
 * §6 "data accuracy gaps" tooltip.
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

const ACTOR_ID = 'apify/instagram-scraper';
const POSTS_PER_SCRAPE = 30;
const CAPTION_LIMIT = 280;

/** Subset of fields we actually read from Apify's dataset item. */
interface IgItem {
  // Post-level
  id?: string;
  shortCode?: string;
  caption?: string | null;
  url?: string;
  commentsCount?: number | null;
  displayUrl?: string | null;
  videoUrl?: string | null;
  likesCount?: number | null;
  videoViewCount?: number | null;
  timestamp?: string | null;
  productType?: string | null;
  type?: string | null;
  childPosts?: unknown[];
  // Parent profile (addParentData: true)
  username?: string;
  fullName?: string | null;
  followersCount?: number | null;
  followsCount?: number | null;
  isPrivate?: boolean;
  // Error/empty markers some Apify actors set
  error?: string;
  errorDescription?: string;
}

function pickContentType(item: IgItem): ContentType {
  const t = (item.productType || item.type || '').toLowerCase();
  if (t === 'clips' || t === 'reel' || t === 'video') return 'reel';
  if (item.videoUrl) return 'video';
  if (Array.isArray(item.childPosts) && item.childPosts.length > 0) {
    return 'image'; // carousel — treat as image
  }
  return 'image';
}

function truncate(s: string | null | undefined, n: number): string | null {
  if (!s) return null;
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

function mapPost(item: IgItem): NormalizedPostSnapshot | null {
  const externalId = item.shortCode || item.id;
  if (!externalId) return null;
  return {
    external_post_id: externalId,
    posted_at: item.timestamp ?? null,
    caption_excerpt: truncate(item.caption, CAPTION_LIMIT),
    views: item.videoViewCount ?? null,
    likes: item.likesCount ?? null,
    comments: item.commentsCount ?? null,
    shares: null, // IG doesn't expose share count publicly
    media_url: item.displayUrl ?? null,
    content_type: pickContentType(item),
    raw: item,
  };
}

function mapProfile(
  first: IgItem,
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
    followers: first.followersCount ?? null,
    following: first.followsCount ?? null,
    total_posts: null, // actor doesn't expose lifetime post count
    total_views: viewsSeen ? totalViews : null,
    total_likes: likesSeen ? totalLikes : null,
    raw: {
      username: first.username,
      fullName: first.fullName,
      sample_size: posts.length,
    },
  };
}

export const instagramAdapter: PlatformAdapter = {
  platform: 'instagram',
  actorId: ACTOR_ID,
  async scrape(profileUrl: string): Promise<ScrapeResult> {
    const items = await runActor<IgItem>({
      actorId: ACTOR_ID,
      platform: 'instagram',
      profileUrl,
      input: {
        directUrls: [profileUrl],
        resultsType: 'posts',
        resultsLimit: POSTS_PER_SCRAPE,
        addParentData: true,
      },
      timeoutSecs: 300,
    });

    // Inspect first item for error markers Apify sometimes embeds
    const first = items[0];
    if (first?.error) {
      const msg = (first.errorDescription || first.error).toLowerCase();
      if (msg.includes('private')) {
        throw new ProfilePrivateError('instagram', profileUrl);
      }
      if (msg.includes('not found') || msg.includes('does not exist')) {
        throw new ProfileNotFoundError('instagram', profileUrl);
      }
    }
    if (first?.isPrivate) {
      throw new ProfilePrivateError('instagram', profileUrl);
    }
    if (!first || !first.username) {
      throw new ProfileNotFoundError('instagram', profileUrl);
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
