/**
 * Live smoke test — costs Apify compute units.
 * Run: pnpm exec tsx libraries/scrapers/src/adapters/facebook.smoke.ts
 *
 * NOT part of the standard test suite. Manually triggered when an adapter
 * lands or when Apify-side changes are suspected (per spec §6 operational
 * hygiene — per-platform success-rate monitoring starts here).
 *
 * Note: apify/facebook-posts-scraper does not expose follower count for the
 * scraped page (see facebook.ts JSDoc), so the usual "followers > N" gate
 * IG and TikTok smoke tests use can't apply here. We instead gate on
 * window-totals (likes summed across posts) which scale similarly with page
 * size, and on the page identity coming back populated.
 */

import { facebookAdapter } from './facebook';

// Cristiano Ronaldo — most-followed person on Facebook (170M+). Stable
// public page, posts frequently. Public pages only — this actor does not
// scrape personal profiles.
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
  if (!profile.total_likes || profile.total_likes < 10_000_000) {
    throw new Error(
      `Sanity fail: Cristiano's last ${posts.length} posts should sum to 10M+ likes, got ${profile.total_likes}`,
    );
  }
  const rawProfile = profile.raw as { pageName?: string };
  if (!rawProfile?.pageName) {
    throw new Error('Sanity fail: pageName missing from profile.raw');
  }
  console.log('[smoke] PASS');
}

main().catch((err) => {
  console.error('[smoke] FAIL', err);
  process.exit(1);
});
