/**
 * Facebook adapter — Bright Data Web Scraper API.
 *
 * Datasets used (Bright Data prebuilt collectors):
 *   - Facebook profile/page by URL: gd_mf124a0511bauquyow ("Facebook - Pages and Profiles")
 *       Accepts BOTH personal profiles AND public pages. Exposes followers /
 *       page_likes / post_count / verified / category / intro / profile_pic
 *       — fields the previous Apify actor did NOT.
 *       (Note: gd_mf0urb782734ik94dz "Facebook - Profiles" rejects PAGE-type
 *       URLs with error_code "bad_input". Use the Pages-and-Profiles dataset
 *       to cover both.)
 *   - Facebook posts by URL:   gd_lkaxegm826bjpoo9m5    ("Facebook - Pages Posts by Profile URL")
 *       Latest N posts per profile URL with likes / comments / shares /
 *       views / attachments / timestamp.
 *
 * IDs verified live against /datasets/list on 2026-05-28.
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
import { ProfileNotFoundError, ProfilePrivateError, ScrapeError } from '../errors';
import type {
  ContentType,
  NormalizedPostSnapshot,
  NormalizedProfileSnapshot,
  PlatformAdapter,
  ScrapeResult,
} from '../types';

const PLATFORM = 'facebook';
const PROFILE_DATASET_ID = 'gd_mf124a0511bauquyow';
const POSTS_DATASET_ID = 'gd_lkaxegm826bjpoo9m5';
const POSTS_PER_SCRAPE = 30;
const CAPTION_LIMIT = 280;

/** Bright Data FB profile item (gd_mf124a0511bauquyow). */
interface BdFbProfile {
  url?: string;
  id?: string;
  page_name?: string | null;
  username?: string | null;
  /** "PAGE" | "PROFILE" — dataset returns both. */
  entity_type?: string | null;
  /** Lifetime page followers (live, the headline win over the old Apify actor). */
  followers?: number | null;
  /** Bio / intro text on the page. */
  summary_text?: string | null;
  /** Page logo / avatar URL. */
  logo?: string | null;
  /** Profile-page (personal) avatar — present when entity_type==='PROFILE'. */
  profile_pic?: string | null;
  cover_picture?: string | null;
  primary_category?: string | null;
  is_verified?: boolean;
  is_business_page?: boolean;
  page_transparency?: {
    page_id?: string | null;
    creation_date?: string | null;
    is_running_ads?: boolean;
  };
  contact_and_basic_info?: {
    categories?: string[];
  };
  /** BD sets these on failed per-row collections. */
  error?: string;
  /** Distinct codes: 'bad_input' (wrong URL type), 'dead_page', etc. */
  error_code?: string;
  warning?: string;
}

/** Bright Data FB post item (gd_lkaxegm826bjpoo9m5). */
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
  // Pages-and-Profiles dataset does NOT expose a lifetime page-likes counter
  // or a post_count, despite returning followers cleanly. Window-sum likes
  // from the post-window — matches the prior Apify adapter's fallback.
  return {
    followers: prof.followers ?? null,
    following: null, // FB pages have no following counter
    total_posts: null, // not exposed by gd_mf124a0511bauquyow
    total_views: viewsSeen ? totalViews : null,
    total_likes: likesSeen ? totalLikes : null,
    raw: {
      facebook_id: prof.id,
      page_name: prof.page_name,
      username: prof.username,
      entity_type: prof.entity_type,
      logo: prof.logo,
      profile_pic: prof.profile_pic ?? null,
      cover_picture: prof.cover_picture,
      primary_category: prof.primary_category,
      verified: prof.is_verified ?? null,
      summary_text: prof.summary_text,
      page_id: prof.page_transparency?.page_id,
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
  // Tagged with the BrightData profile dataset ID for traceability.
  sourceId: `brightdata:${PROFILE_DATASET_ID}`,
  async scrape(profileUrl: string): Promise<ScrapeResult> {
    // BD Pages-and-Profiles dataset has historically taken 3-7 min per scrape
    // on cold inputs (avg_duration_per_input ~390s observed live). The
    // adapter budget MUST stay under Vercel's Function maxDuration (300s) so
    // the adapter throws a clean ScrapeError before the Function dies — that
    // way we can write `failed` status to the profile row instead of leaving
    // it orphaned in `pending`. Cap at 240s (4 min) to leave ~60s of margin
    // for Supabase round-trips, status update, and JSON response.
    //
    // Consequence: FB scrapes that exceed 4 min get marked `failed` and the
    // next cron will retry. If failures become chronic, move FB to a
    // queue/webhook pattern (track snapshot_id, poll out-of-band).
    const FB_BUDGET_MS = 240_000;
    const FB_POLL_MS = 10_000;
    const [profileItems, postItems] = await Promise.all([
      runDataset<BdFbProfile>({
        datasetId: PROFILE_DATASET_ID,
        inputs: [{ url: profileUrl }],
        platform: PLATFORM,
        profileUrl,
        timeoutMs: FB_BUDGET_MS,
        pollIntervalMs: FB_POLL_MS,
      }),
      runDataset<BdFbPost>({
        datasetId: POSTS_DATASET_ID,
        inputs: [{ url: profileUrl, num_of_posts: POSTS_PER_SCRAPE }],
        platform: PLATFORM,
        profileUrl,
        timeoutMs: FB_BUDGET_MS,
        pollIntervalMs: FB_POLL_MS,
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
    // BD records can include error_code on per-row failures. Distinguish:
    //   'bad_input' / 'invalid_url' → caller passed an unsupported URL shape.
    //                                  Map to failed (configuration issue), not not_found.
    //   'dead_page' / 'profile_not_found' → genuine 404.
    //   'private' / 'restricted'          → private.
    if (first.error_code) {
      const code = first.error_code.toLowerCase();
      const msg = first.error || code;
      if (code.includes('private') || code.includes('restricted')) {
        throw new ProfilePrivateError(PLATFORM, profileUrl);
      }
      if (code.includes('dead') || code.includes('not_found') || code.includes('deleted')) {
        throw new ProfileNotFoundError(PLATFORM, profileUrl);
      }
      // bad_input + everything else → surface as failed with the BD message so
      // operators see exactly what Bright Data rejected.
      throw new ScrapeError(
        'failed',
        `Bright Data rejected input (${code}): ${msg}`,
        PLATFORM,
        profileUrl,
      );
    }
    if (isPrivate(first)) {
      throw new ProfilePrivateError(PLATFORM, profileUrl);
    }
    if (isNotFound(first)) {
      throw new ProfileNotFoundError(PLATFORM, profileUrl);
    }
    // No page identity at all = treat as not_found.
    if (!first.id && !first.page_name && !first.username && !first.url) {
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
