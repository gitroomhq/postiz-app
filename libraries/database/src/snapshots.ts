/**
 * Snapshot writes — called by the daily cron and the manual scrape trigger.
 *
 * Uniqueness is enforced by the unique indexes from migration
 * 20260527135229_init_v1_core_tables:
 *   profile_snapshot_unique_day  (profile_id, captured_date)
 *   post_snapshot_unique_day     (profile_id, external_post_id, captured_date)
 *
 * Both writers UPSERT with onConflict so re-running on the same day is
 * idempotent (the latest values win — last write wins, intentional).
 */

import { getSupabaseAdmin } from './supabase-server';
import type { ProfileRow, ScrapeStatus } from './types';

/** Shape returned by the scraper layer (mirror of @d3/scrapers NormalizedProfileSnapshot). */
export interface ProfileSnapshotInput {
  followers: number | null;
  following: number | null;
  total_posts: number | null;
  total_views: number | null;
  total_likes: number | null;
  raw: unknown;
}

/** Shape returned by the scraper layer (mirror of NormalizedPostSnapshot). */
export interface PostSnapshotInput {
  external_post_id: string;
  posted_at: string | null;
  caption_excerpt: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  media_url: string | null;
  content_type: string;
  raw: unknown;
}

/** Profiles the cron should attempt today. */
export async function listScrapeableProfiles(): Promise<ProfileRow[]> {
  const sb = getSupabaseAdmin();
  // Skip statuses that require user action to re-enable. 'private' /
  // 'not_found' / 'handle_changed' all need a human; the rest are fair game.
  const res = await sb
    .from('profile')
    .select('*')
    .not('scrape_status', 'in', '("private","not_found","handle_changed")')
    .order('created_at', { ascending: true });
  if (res.error) {
    throw new Error(`listScrapeableProfiles failed: ${res.error.message}`);
  }
  return (res.data ?? []) as ProfileRow[];
}

/** Idempotent UPSERT keyed on (profile_id, captured_date). */
export async function upsertProfileSnapshot(
  profileId: string,
  snap: ProfileSnapshotInput,
): Promise<void> {
  const sb = getSupabaseAdmin();
  const res = await sb
    .from('profile_snapshot')
    .upsert(
      {
        profile_id: profileId,
        followers: snap.followers,
        following: snap.following,
        total_posts: snap.total_posts,
        total_views: snap.total_views,
        total_likes: snap.total_likes,
        raw: snap.raw,
      },
      { onConflict: 'profile_id,captured_date' },
    );
  if (res.error) {
    throw new Error(`upsertProfileSnapshot failed: ${res.error.message}`);
  }
}

/**
 * Idempotent batch UPSERT of post snapshots. Returns counts for observability.
 * Empty input is a no-op (some platforms may produce 0 posts).
 */
export async function upsertPostSnapshots(
  profileId: string,
  posts: PostSnapshotInput[],
): Promise<{ written: number }> {
  if (posts.length === 0) return { written: 0 };
  const sb = getSupabaseAdmin();
  const rows = posts.map((p) => ({
    profile_id: profileId,
    external_post_id: p.external_post_id,
    posted_at: p.posted_at,
    caption_excerpt: p.caption_excerpt,
    views: p.views,
    likes: p.likes,
    comments: p.comments,
    shares: p.shares,
    media_url: p.media_url,
    content_type: p.content_type,
    raw: p.raw,
  }));
  const res = await sb
    .from('post_snapshot')
    .upsert(rows, { onConflict: 'profile_id,external_post_id,captured_date' });
  if (res.error) {
    throw new Error(`upsertPostSnapshots failed: ${res.error.message}`);
  }
  return { written: posts.length };
}

/** Update profile.scrape_status + last_scraped_at after a scrape attempt. */
export async function setProfileStatus(
  profileId: string,
  status: ScrapeStatus,
  scrapedAt: Date = new Date(),
): Promise<void> {
  const sb = getSupabaseAdmin();
  const res = await sb
    .from('profile')
    .update({
      scrape_status: status,
      last_scraped_at: scrapedAt.toISOString(),
    })
    .eq('id', profileId);
  if (res.error) {
    throw new Error(`setProfileStatus failed: ${res.error.message}`);
  }
}
