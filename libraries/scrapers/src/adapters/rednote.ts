/**
 * RedNote (Xiaohongshu / 小红书) adapter
 * Apify Actor: easyapi/all-in-one-rednote-xiaohongshu-scraper.
 * https://apify.com/easyapi/all-in-one-rednote-xiaohongshu-scraper
 *
 * Why this actor:
 *   - Most-used RedNote scraper on Apify Store (~1.3k users, recently updated).
 *   - Supports a `userPosts` mode that takes a profile URL and returns the
 *     latest N notes with engagement counts — closest match to the IG/TikTok
 *     pattern (one actor call yields posts + embedded user identifier).
 *   - Same publisher (easyapi) also ships a profile-only scraper. We chose
 *     the all-in-one to keep a single Apify call per snapshot; we accept that
 *     follower-level fields are not returned in this mode (see "Profile
 *     fields not exposed" below).
 *
 * Input shape (per actor input schema, verified 2026-05-28):
 *   mode:           'userPosts'           — picks the user-posts operation
 *   profileUrls:    string[]              — profile URLs (single-entry array)
 *   maxItems:       number                — caps posts per profile (min 30)
 *
 * Output: dataset items shaped as
 *   { profileUrl, postData: { noteId, displayTitle, type, user, interactInfo,
 *                             cover, ... }, scrapedAt }
 *
 * Output mapping:
 *   Post
 *     - external_post_id: postData.noteId
 *     - caption_excerpt:  postData.displayTitle (XHS notes have a "title" not
 *                         a "caption"; we treat the title as the excerpt)
 *     - likes:            interactInfo.likedCount (string in payload, parsed)
 *     - comments:         interactInfo.commentCount when present (XHS exposes
 *                         it on richer payloads; null when absent)
 *     - shares:           interactInfo.collectedCount when present (XHS uses
 *                         收藏/collects as the closest analog to shares — it
 *                         is the share-and-save metric surfaced on a note)
 *     - views:            null (XHS does not expose per-note view counts on
 *                         the user-posts endpoint)
 *     - media_url:        cover.urlDefault → urlPre → url (first non-empty)
 *     - content_type:     'video' if postData.type === 'video', else 'image'
 *                         (image-notes show as 'normal' or 'image')
 *     - posted_at:        null when absent — the user-posts endpoint does
 *                         not consistently return a per-note timestamp.
 *
 *   Profile fields not exposed by this actor in userPosts mode:
 *     - followers, following, total_posts, total_views, total_likes
 *     All five return null. The actor's userPosts payload embeds only
 *     user.nickName / userId / avatar — not follower-side counters.
 *     If/when we need these we'll either upgrade to a two-call flow
 *     (userPosts + profile) or switch to an actor that returns both.
 *     Documented in spec §6 "data accuracy gaps".
 */

import { runActor } from '../apify-client';
import { ProfileNotFoundError } from '../errors';
import type {
  ContentType,
  NormalizedPostSnapshot,
  NormalizedProfileSnapshot,
  PlatformAdapter,
  ScrapeResult,
} from '../types';

const ACTOR_ID = 'easyapi/all-in-one-rednote-xiaohongshu-scraper';
const POSTS_PER_SCRAPE = 30;
const CAPTION_LIMIT = 280;

/** User block embedded in every postData item. */
interface XhsUser {
  userId?: string;
  nickName?: string;
  nickname?: string; // actor returns both casings; tolerate either
  avatar?: string | null;
}

/** Engagement counters. XHS returns counts as strings (e.g. "8794"). */
interface XhsInteractInfo {
  likedCount?: string | number | null;
  commentCount?: string | number | null;
  collectedCount?: string | number | null;
  sharedCount?: string | number | null;
}

/** Cover/thumbnail metadata. */
interface XhsCover {
  url?: string | null;
  urlPre?: string | null;
  urlDefault?: string | null;
  width?: number;
  height?: number;
}

/** Inner postData object on each dataset item. */
interface XhsPostData {
  noteId?: string;
  postUrl?: string | null;
  displayTitle?: string | null;
  /** 'video' for video notes; 'normal' or 'image' for image notes. */
  type?: string | null;
  user?: XhsUser;
  interactInfo?: XhsInteractInfo;
  cover?: XhsCover;
  /** Optional timestamp — rarely present on user-posts payloads. */
  time?: number | string | null;
}

/** Top-level dataset item shape. */
interface XhsItem {
  profileUrl?: string;
  postData?: XhsPostData;
  scrapedAt?: string;
  // Error / empty markers some Apify actors set
  error?: string;
  errorDescription?: string;
}

function truncate(s: string | null | undefined, n: number): string | null {
  if (!s) return null;
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

/** Coerce XHS string counters ("8794") to numbers; tolerate already-numeric. */
function toNum(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function pickContentType(post: XhsPostData): ContentType {
  const t = (post.type || '').toLowerCase();
  if (t === 'video') return 'video';
  return 'image';
}

function pickMediaUrl(cover: XhsCover | undefined): string | null {
  if (!cover) return null;
  return cover.urlDefault || cover.urlPre || cover.url || null;
}

function mapPost(item: XhsItem): NormalizedPostSnapshot | null {
  const post = item.postData;
  if (!post) return null;
  const externalId = post.noteId;
  if (!externalId) return null;

  const info = post.interactInfo ?? {};
  return {
    external_post_id: externalId,
    posted_at: typeof post.time === 'string' ? post.time : null,
    caption_excerpt: truncate(post.displayTitle, CAPTION_LIMIT),
    views: null, // XHS user-posts endpoint does not expose view counts
    likes: toNum(info.likedCount),
    comments: toNum(info.commentCount),
    shares: toNum(info.collectedCount ?? info.sharedCount),
    media_url: pickMediaUrl(post.cover),
    content_type: pickContentType(post),
    raw: item,
  };
}

function mapProfile(
  first: XhsItem,
  posts: NormalizedPostSnapshot[],
): NormalizedProfileSnapshot {
  const user = first.postData?.user ?? {};
  return {
    // Not exposed by this actor's userPosts mode — see file header.
    followers: null,
    following: null,
    total_posts: null,
    total_views: null,
    total_likes: null,
    raw: {
      userId: user.userId,
      nickname: user.nickName ?? user.nickname,
      avatarUrl: user.avatar ?? null,
      sample_size: posts.length,
    },
  };
}

export const rednoteAdapter: PlatformAdapter = {
  platform: 'rednote',
  actorId: ACTOR_ID,
  async scrape(profileUrl: string): Promise<ScrapeResult> {
    const items = await runActor<XhsItem>({
      actorId: ACTOR_ID,
      platform: 'rednote',
      profileUrl,
      input: {
        mode: 'userPosts',
        profileUrls: [profileUrl],
        maxItems: POSTS_PER_SCRAPE,
      },
      timeoutSecs: 300,
    });

    // Inspect first item for error markers Apify sometimes embeds.
    // XHS rarely surfaces a "private" state — accounts are either reachable
    // or 404 — so we only check for not-found here.
    const first = items[0];
    if (first?.error) {
      const msg = (first.errorDescription || first.error).toLowerCase();
      if (
        msg.includes('not found') ||
        msg.includes('does not exist') ||
        msg.includes('404') ||
        msg.includes('invalid')
      ) {
        throw new ProfileNotFoundError('rednote', profileUrl);
      }
    }
    if (!first || !first.postData?.noteId) {
      throw new ProfileNotFoundError('rednote', profileUrl);
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
