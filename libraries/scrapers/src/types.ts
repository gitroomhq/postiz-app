/**
 * Normalized scraper output shape.
 *
 * Every platform adapter MUST conform to this shape regardless of what the
 * underlying Apify Actor returns. Adapters live in
 * libraries/scrapers/src/adapters/<platform>.ts and are the only place where
 * Actor-specific parsing happens.
 */

export type Platform =
  | 'instagram'
  | 'tiktok'
  | 'facebook'
  | 'rednote'
  | 'douyin';

export type ContentType = 'image' | 'video' | 'reel' | 'short' | 'unknown';

/** Profile-level stats. One per scrape per profile. */
export interface NormalizedProfileSnapshot {
  followers: number | null;
  following: number | null;
  total_posts: number | null;
  total_views: number | null;
  total_likes: number | null;
  /** Raw actor output for debugging. */
  raw: unknown;
}

/** Per-post stats. Up to ~30 most recent posts per scrape per profile. */
export interface NormalizedPostSnapshot {
  external_post_id: string;
  posted_at: string | null; // ISO 8601
  caption_excerpt: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  media_url: string | null;
  content_type: ContentType;
  raw: unknown;
}

/** What a runScraper(platform, url) call resolves to. */
export interface ScrapeResult {
  profile: NormalizedProfileSnapshot;
  posts: NormalizedPostSnapshot[];
}

/** Adapter contract — every platform implements this. */
export interface PlatformAdapter {
  platform: Platform;
  /** Apify Actor ID, e.g. 'apify/instagram-scraper' */
  actorId: string;
  scrape(profileUrl: string): Promise<ScrapeResult>;
}
