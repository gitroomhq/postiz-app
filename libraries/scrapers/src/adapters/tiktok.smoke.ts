/**
 * Live smoke test — costs Apify compute units.
 * Run: pnpm exec tsx libraries/scrapers/src/adapters/tiktok.smoke.ts
 *
 * NOT part of the standard test suite. Manually triggered when an adapter
 * lands or when Apify-side changes are suspected (per spec §6 operational
 * hygiene — per-platform success-rate monitoring starts here).
 */

import { tiktokAdapter } from './tiktok';

// khaby.lame — most-followed TikTok creator (~162M followers). Stable
// public profile, lots of recent videos.
const TEST_PROFILE = 'https://www.tiktok.com/@khaby.lame';

async function main() {
  console.log(`[smoke] scraping ${TEST_PROFILE}`);
  const t0 = Date.now();
  const { profile, posts } = await tiktokAdapter.scrape(TEST_PROFILE);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  console.log(`[smoke] elapsed=${elapsed}s posts=${posts.length}`);
  console.log('[smoke] profile:', {
    followers: profile.followers,
    following: profile.following,
    total_posts: profile.total_posts,
    total_views: profile.total_views,
    total_likes: profile.total_likes,
  });
  if (posts[0]) {
    const { raw: _raw, ...display } = posts[0];
    console.log('[smoke] first post:', display);
  }

  // Sanity gates
  if (!profile.followers || profile.followers < 50_000_000) {
    throw new Error(
      `Sanity fail: khaby.lame should have 100M+ followers, got ${profile.followers}`,
    );
  }
  if (posts.length === 0) {
    throw new Error('Sanity fail: expected >=1 post');
  }
  console.log('[smoke] PASS');
}

main().catch((err) => {
  console.error('[smoke] FAIL', err);
  process.exit(1);
});
