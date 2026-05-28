/**
 * RedNote (Xiaohongshu / 小红书) adapter — TikHub REST.
 *
 * Endpoints used:
 *   GET /api/v1/xiaohongshu/web/get_user_info?user_id=<id>
 *   GET /api/v1/xiaohongshu/app/get_user_notes?user_id=<id>
 *
 * Migration history:
 *   - 2026-05-28 initial: used /web/v2/fetch_user_info + /web/get_user_notes_v2.
 *     The /v2/fetch_user_info path was eventually removed by TikHub (404)
 *     and /get_user_notes_v2 was marked deprecated with a "migrate to the
 *     Xiaohongshu-App-V2-API series" message. Switched to the unversioned
 *     /web/get_user_info (still healthy) and /app/get_user_notes (the
 *     equivalent under the new App namespace).
 *
 * The user_id lives in the profile URL path (xiaohongshu.com/user/profile/<id>),
 * so no lookup round-trip needed.
 *
 * Response envelope: both endpoints double-wrap the payload. tikhubGet()
 * strips the OUTER {code, request_id, ..., data} envelope, so what arrives
 * here is the INNER {code, success, data, msg, ...} envelope. We then drill
 * into .data to get the actual user / notes payload.
 *
 * Output mapping:
 *   Profile
 *     - followers:    data.fans (number, directly from the user object)
 *     - following:    data.follows
 *     - total_posts:  null (no clean "posted notes count" field exposed —
 *                     note_num_stat exists but its meaning isn't documented;
 *                     leave null per spec §6 rather than guess)
 *     - total_likes:  data.liked (lifetime likes received — XHS "获赞" total,
 *                     unlike IG/TT this is a real lifetime value, not a
 *                     window-sum)
 *     - total_views:  null (XHS doesn't expose per-note view counts on the
 *                     user-notes endpoint)
 *   Post (each note)
 *     - external_post_id: note.id  (24-char hex)
 *     - posted_at:        ISO from note.create_time (unix seconds)
 *     - caption_excerpt:  note.display_title || note.title
 *     - content_type:     'video' if note.type === 'video', else 'image'
 *     - likes:            note.likes (flat, not nested)
 *     - comments:         note.comments_count
 *     - shares:           note.share_count
 *     - views:            note.view_count when > 0 (XHS often returns 0
 *                         for image notes — treat as null in that case
 *                         since the field is missing-data not a real zero)
 *     - media_url:        note.images_list[0].url (first cover image)
 *
 * Migrated from Apify Actor easyapi/all-in-one-rednote-xiaohongshu-scraper
 * (2026-05-28).
 */

import { tikhubGet } from '../tikhub-client';
import { ProfileNotFoundError, ScrapeError } from '../errors';
import type {
  ContentType,
  NormalizedPostSnapshot,
  NormalizedProfileSnapshot,
  PlatformAdapter,
  ScrapeResult,
} from '../types';

const PLATFORM = 'rednote';
const POSTS_PER_SCRAPE = 30;
const CAPTION_LIMIT = 280;

/** Extract user_id from a normalized xiaohongshu.com URL: /user/profile/<id>. */
function extractUserId(profileUrl: string): string {
  const u = new URL(profileUrl);
  const m = u.pathname.match(/^\/user\/profile\/([A-Za-z0-9]+)\/?$/);
  if (!m) {
    throw new ScrapeError(
      'failed',
      `Cannot extract Xiaohongshu user_id from path "${u.pathname}"`,
      PLATFORM,
      profileUrl,
    );
  }
  return m[1];
}

/**
 * Inner envelope that XHS endpoints wrap their data in (after tikhubGet
 * strips the outer TikHub envelope).
 */
interface XhsInnerEnvelope<T> {
  code?: number;
  success?: boolean;
  data?: T;
  msg?: string;
}

/** Profile body (data.data on the web/get_user_info response). */
interface XhsUserInfo {
  userid?: string;
  red_id?: string | number | null;
  nickname?: string | null;
  desc?: string | null;
  images?: string | null;     // avatar url
  imageb?: string | null;     // larger avatar url
  ip_location?: string | null;
  // Counters — flat, directly on the user object.
  fans?: number | null;
  follows?: number | null;
  liked?: number | null;
  collected?: number | null;
}

interface XhsImageItem {
  url?: string | null;
  url_size_large?: string | null;
  width?: number;
  height?: number;
}

/** One note in the app/get_user_notes response. */
interface XhsNote {
  id?: string;
  title?: string | null;
  display_title?: string | null;
  /** 'normal' = image-note, 'video' = video-note. */
  type?: string | null;
  /** Unix seconds. */
  create_time?: number | null;
  /** Counters — all flat, no nested interact_info on this endpoint. */
  likes?: number | null;
  comments_count?: number | null;
  collected_count?: number | null;
  share_count?: number | null;
  view_count?: number | null;
  sticky?: boolean;
  images_list?: XhsImageItem[];
  user?: { userid?: string; nickname?: string; images?: string };
}

interface XhsNotesPayload {
  notes?: XhsNote[];
  /** Some payloads use cursor-based pagination; not wired today. */
  cursor?: string;
  has_more?: boolean;
}

function truncate(s: string | null | undefined, n: number): string | null {
  if (!s) return null;
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

function pickContentType(n: XhsNote): ContentType {
  return (n.type || '').toLowerCase() === 'video' ? 'video' : 'image';
}

function pickMediaUrl(n: XhsNote): string | null {
  const first = n.images_list?.[0];
  if (!first) return null;
  return first.url_size_large ?? first.url ?? null;
}

function unixToIso(s: number | null | undefined): string | null {
  if (typeof s !== 'number' || !Number.isFinite(s)) return null;
  return new Date(s * 1000).toISOString();
}

function mapNote(n: XhsNote): NormalizedPostSnapshot | null {
  if (!n.id) return null;
  // XHS returns view_count = 0 for image notes (no view tracking) — treat
  // 0 as missing data, not a real zero, so the aggregator on the rollup
  // can distinguish "we never had this number" from "literally zero views".
  const views = typeof n.view_count === 'number' && n.view_count > 0 ? n.view_count : null;
  return {
    external_post_id: n.id,
    posted_at: unixToIso(n.create_time),
    caption_excerpt: truncate(n.display_title ?? n.title, CAPTION_LIMIT),
    views,
    likes: n.likes ?? null,
    comments: n.comments_count ?? null,
    shares: n.share_count ?? null,
    media_url: pickMediaUrl(n),
    content_type: pickContentType(n),
    raw: n,
  };
}

function mapProfile(
  user: XhsUserInfo,
  posts: NormalizedPostSnapshot[],
): NormalizedProfileSnapshot {
  return {
    followers: user.fans ?? null,
    following: user.follows ?? null,
    total_posts: null,
    total_views: null,
    total_likes: user.liked ?? null,
    raw: {
      userid: user.userid,
      red_id: user.red_id,
      nickname: user.nickname,
      desc: user.desc,
      avatar_url: user.imageb ?? user.images ?? null,
      ip_location: user.ip_location,
      collected: user.collected,
      sample_size: posts.length,
    },
  };
}

/** Drill into the inner XHS envelope and return the inner data, or null. */
function unwrapInner<T>(resp: XhsInnerEnvelope<T> | null | undefined): T | null {
  if (!resp) return null;
  // Some endpoints set `code === 0` for success (XHS-internal convention).
  // Our tikhubGet already handled the outer envelope; this is the inner one
  // and we treat success==true OR code in {0,200} as OK.
  if (resp.success === false) return null;
  if (resp.code !== undefined && resp.code !== 0 && resp.code !== 200) return null;
  return resp.data ?? null;
}

export const rednoteAdapter: PlatformAdapter = {
  platform: 'rednote',
  actorId: 'tikhub:xiaohongshu/web',
  async scrape(profileUrl: string): Promise<ScrapeResult> {
    const userId = extractUserId(profileUrl);

    const [userInfoWrapped, notesWrapped] = await Promise.all([
      tikhubGet<XhsInnerEnvelope<XhsUserInfo>>({
        path: '/api/v1/xiaohongshu/web/get_user_info',
        query: { user_id: userId },
        platform: PLATFORM,
        profileUrl,
      }),
      tikhubGet<XhsInnerEnvelope<XhsNotesPayload>>({
        path: '/api/v1/xiaohongshu/app/get_user_notes',
        query: { user_id: userId },
        platform: PLATFORM,
        profileUrl,
      }).catch((err) => {
        // Some accounts hide their notes tab — still surface profile data.
        if (err instanceof ScrapeError && err.status === 'private') {
          return { success: true, code: 0, data: {} } as XhsInnerEnvelope<XhsNotesPayload>;
        }
        throw err;
      }),
    ]);

    const userInfo = unwrapInner(userInfoWrapped);
    if (!userInfo || (!userInfo.nickname && !userInfo.userid)) {
      throw new ProfileNotFoundError(PLATFORM, profileUrl);
    }

    const notesPayload = unwrapInner(notesWrapped);
    const rawNotes = (notesPayload?.notes ?? []).slice(0, POSTS_PER_SCRAPE);
    const posts: NormalizedPostSnapshot[] = [];
    for (const n of rawNotes) {
      const mapped = mapNote(n);
      if (mapped) posts.push(mapped);
    }

    return {
      profile: mapProfile(userInfo, posts),
      posts,
    };
  },
};
