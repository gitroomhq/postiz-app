/**
 * Live smoke test — costs Bright Data credits.
 * Run: pnpm exec tsx libraries/scrapers/src/adapters/facebook.smoke.ts
 *
 * NOT part of the standard test suite. Manually triggered when an adapter
 * lands or when Bright Data-side changes are suspected (per spec §6
 * operational hygiene — per-platform success-rate monitoring starts here).
 *
 * Requires BRIGHTDATA_API_KEY in env.
 *
 * Unlike the prior Apify actor, Bright Data's FB profile dataset
 * (gd_lkay758p1eanlolqw8) DOES expose followers / posts_count / lifetime
 * page likes — so we gate on the live counters when present and fall back
 * to window-total likes only if profile.followers is null.
 */

import { facebookAdapter } from './facebook';

// Cristiano Ronaldo — most-followed person on Facebook (170M+). Stable
// public page, posts frequently. Public pages only.
const TEST_PROFILE = 'https://www.facebook.com/Cristiano';

async function main() {
  console.log(`[smoke] scraping ${TEST_PROFILE}`);
  const t0 = Date.now();
  const { profile, posts } = await facebookAdapter.scrape(TEST_PROFILE);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  console.log(`[smoke] elapsed=${elapsed}s posts=${posts.length}`);
  console.log('[smoke] profile:', {
    followers: profile.followers,
    following: profile.following,
    total_posts: profile.total_posts,
    total_views: profile.total_views,
    total_likes: profile.total_likes,
    raw: profile.raw,
  });
  if (posts[0]) {
    const { raw: _raw, ...display } = posts[0];
    console.log('[smoke] first post:', display);
  }

  // Sanity gates
  if (posts.length === 0) {
    throw new Error('Sanity fail: expected >=1 post');
  }
  const rawProfile = profile.raw as { page_name?: string; facebook_id?: string };
  if (!rawProfile?.page_name && !rawProfile?.facebook_id) {
    throw new Error('Sanity fail: page_name and facebook_id both missing from profile.raw');
  }
  if (profile.followers !== null) {
    if (profile.followers < 100_000_000) {
      throw new Error(
        `Sanity fail: Cristiano page should have 100M+ followers, got ${profile.followers}`,
      );
    }
  } else {
    // Profile counter missing — fall back to window-sum likes check.
    if (!profile.total_likes || profile.total_likes < 10_000_000) {
      throw new Error(
        `Sanity fail: followers null and last ${posts.length} posts should sum to 10M+ likes, got ${profile.total_likes}`,
      );
    }
  }
  console.log('[smoke] PASS');
}

main().catch((err) => {
  console.error('[smoke] FAIL', err);
  process.exit(1);
});
