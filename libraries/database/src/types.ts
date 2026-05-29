/**
 * Database row types — mirror of the Supabase schema applied in migration
 * 20260527135229_init_v1_core_tables.sql.
 *
 * Kept hand-written for now. If we adopt supabase-gen later, this file
 * becomes the generated output target.
 */

export type Platform =
  | 'instagram'
  | 'tiktok'
  | 'facebook'
  | 'rednote'
  | 'douyin';

export type ScrapeStatus =
  | 'pending'
  | 'ok'
  | 'failed'
  | 'private'
  | 'not_found'
  | 'throttled'
  | 'handle_changed';

export interface ClientRow {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
}

export interface CreatorRow {
  id: string;
  client_id: string | null;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface ProfileRow {
  id: string;
  creator_id: string;
  platform: Platform;
  profile_url: string;
  handle: string | null;
  display_name: string | null;
  nickname: string | null;
  scrape_status: ScrapeStatus;
  last_scraped_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileSnapshotRow {
  id: number;
  profile_id: string;
  captured_at: string;
  captured_date: string;
  followers: number | null;
  following: number | null;
  total_posts: number | null;
  total_views: number | null;
  total_likes: number | null;
  raw: unknown;
}

export interface PostSnapshotRow {
  id: number;
  profile_id: string;
  external_post_id: string;
  captured_at: string;
  captured_date: string;
  posted_at: string | null;
  caption_excerpt: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  media_url: string | null;
  content_type: string | null;
  raw: unknown;
}

/** Discriminated result for fn-style API (no throwing for expected errors). */
export type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type ClaimKind = 'owner' | 'tracker' | 'pending';
export type ClaimedVia = 'manual' | 'auto_discovery' | 'admin_assigned';

export interface ProfileClaimRow {
  user_id: string;
  profile_id: string;
  claim_kind: ClaimKind;
  claimed_via: ClaimedVia;
  created_at: string;
  confirmed_at: string | null;
}

/** Auto-discovery candidate returned by `findCandidatesByHandle`. */
export interface DiscoveryCandidate {
  profile: ProfileRow;
  score: number;
  /** 'high' (>=0.92) | 'review' (>=0.75). Below 0.75 are filtered out. */
  bucket: 'high' | 'review';
  matchedOn: 'exact' | 'folded' | 'core' | 'trigram';
}

