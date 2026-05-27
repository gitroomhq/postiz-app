/**
 * RedNote (Xiaohongshu / 小红书) adapter — TikHub REST.
 *
 * Endpoints used:
 *   GET /api/v1/xiaohongshu/web/v2/fetch_user_info?user_id=<id>
 *   GET /api/v1/xiaohongshu/web/get_user_notes_v2?user_id=<id>
 *
 * The user_id lives in the profile URL path (xiaohongshu.com/user/profile/<id>),
 * so no lookup round-trip needed.
 *
 * KEY IMPROVEMENT OVER APIFY: TikHub's web/v2/fetch_user_info returns the
 * follower / following / interaction (likes+collects) counters that the
 * easyapi Apify actor did NOT expose. Those go from null → live values.
 *
 * XHS encodes counters as STRINGS ("8794") — we parse them to numbers.
 *
 * Output mapping:
 *   Profile
 *     - followers:    interactions[count=fans].count (parsed to number)
 *     - following:    interactions[count=follows].count (parsed to number)
 *     - total_posts:  null (web/v2 endpoint does not expose lifetime post count)
 *     - total_likes:  interactions[count=interaction].count — XHS aggregates
 *                     likes + collects into a single 获赞与收藏 counter
 *     - total_views:  null (XHS does not expose per-note view counts)
 *   Post
 *     - content_type: 'video' if type==='video', else 'image'
 *     - likes:        interact_info.liked_count (string → number)
 *     - comments:     interact_info.comment_count
 *     - shares:       interact_info.collected_count (XHS uses 收藏 as the
 *                     closest analog to "share"; documented in spec §6)
 *     - views:        null (not exposed)
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

interface XhsBasicInfo {
  nickname?: string | null;
  desc?: string | null;
  /** Profile picture. */
  images?: string | null;
  imageb?: string | null;
  red_id?: string | null;
  gender?: number;
  ip_location?: string | null;
}

interface XhsInteraction {
  /** XHS keys these by a logical name: "follows" | "fans" | "interaction". */
  type?: string;
  /** Human label, e.g. 关注 / 粉丝 / 获赞与收藏. */
  name?: string;
  /** Count as STRING. */
  count?: string;
}

interface XhsUserInfoData {
  basic_info?: XhsBasicInfo;
  interactions?: XhsInteraction[];
  tab_public?: { collection?: boolean; collection_note?: boolean };
}

interface XhsInteractInfo {
  liked_count?: string | null;
  comment_count?: string | null;
  collected_count?: string | null;
  shared_count?: string | null;
  /** Some payloads also expose 'liked' as boolean — ignore. */
}

interface XhsCover {
  url?: string | null;
  url_pre?: string | null;
  url_default?: string | null;
  width?: number;
  height?: number;
}

interface XhsNote {
  note_id?: string;
  display_title?: string | null;
  /** 'video' | 'normal' (image) */
  type?: string | null;
  cover?: XhsCover;
  interact_info?: XhsInteractInfo;
  user?: { user_id?: string; nickname?: string };
}

interface XhsNotesData {
  notes?: XhsNote[];
  has_more?: boolean;
  cursor?: string;
}

function truncate(s: string | null | undefined, n: number): string | null {
  if (!s) return null;
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

function toNum(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function pickInteraction(
  list: XhsInteraction[] | undefined,
  type: string,
): number | null {
  if (!list) return null;
  const found = list.find((i) => (i.type || '').toLowerCase() === type);
  return found ? toNum(found.count) : null;
}

function pickContentType(n: XhsNote): ContentType {
  return (n.type || '').toLowerCase() === 'video' ? 'video' : 'image';
}

function pickMediaUrl(c: XhsCover | undefined): string | null {
  if (!c) return null;
  return c.url_default || c.url_pre || c.url || null;
}

function mapNote(n: XhsNote): NormalizedPostSnapshot | null {
  if (!n.note_id) return null;
  const info = n.interact_info ?? {};
  return {
    external_post_id: n.note_id,
    posted_at: null, // XHS user-notes endpoint does not expose per-note timestamps
    caption_excerpt: truncate(n.display_title, CAPTION_LIMIT),
    views: null,
    likes: toNum(info.liked_count),
    comments: toNum(info.comment_count),
    shares: toNum(info.collected_count ?? info.shared_count),
    media_url: pickMediaUrl(n.cover),
    content_type: pickContentType(n),
    raw: n,
  };
}

function mapProfile(
  info: XhsUserInfoData,
  posts: NormalizedPostSnapshot[],
): NormalizedProfileSnapshot {
  const basic = info.basic_info ?? {};
  return {
    followers: pickInteraction(info.interactions, 'fans'),
    following: pickInteraction(info.interactions, 'follows'),
    total_posts: null, // not exposed by web/v2/fetch_user_info
    total_views: null, // XHS doesn't expose view counts
    total_likes: pickInteraction(info.interactions, 'interaction'),
    raw: {
      nickname: basic.nickname,
      desc: basic.desc,
      red_id: basic.red_id,
      avatar_url: basic.imageb ?? basic.images ?? null,
      ip_location: basic.ip_location,
      sample_size: posts.length,
    },
  };
}

export const rednoteAdapter: PlatformAdapter = {
  platform: 'rednote',
  actorId: 'tikhub:xiaohongshu/web',
  async scrape(profileUrl: string): Promise<ScrapeResult> {
    const userId = extractUserId(profileUrl);

    const [userInfo, notesData] = await Promise.all([
      tikhubGet<XhsUserInfoData>({
        path: '/api/v1/xiaohongshu/web/v2/fetch_user_info',
        query: { user_id: userId },
        platform: PLATFORM,
        profileUrl,
      }),
      tikhubGet<XhsNotesData>({
        path: '/api/v1/xiaohongshu/web/get_user_notes_v2',
        query: { user_id: userId },
        platform: PLATFORM,
        profileUrl,
      }).catch((err) => {
        // Some XHS accounts hide their notes tab — still surface profile data.
        if (err instanceof ScrapeError && err.status === 'private') {
          return { notes: [] } as XhsNotesData;
        }
        throw err;
      }),
    ]);

    if (!userInfo.basic_info && (!userInfo.interactions || userInfo.interactions.length === 0)) {
      throw new ProfileNotFoundError(PLATFORM, profileUrl);
    }

    const notes = (notesData.notes ?? []).slice(0, POSTS_PER_SCRAPE);
    const posts: NormalizedPostSnapshot[] = [];
    for (const n of notes) {
      const mapped = mapNote(n);
      if (mapped) posts.push(mapped);
    }

    return {
      profile: mapProfile(userInfo, posts),
      posts,
    };
  },
};
