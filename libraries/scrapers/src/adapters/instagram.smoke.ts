/**
 * Live smoke test — costs TikHub API credits.
 * Run: pnpm exec tsx libraries/scrapers/src/adapters/instagram.smoke.ts
 *
 * NOT part of the standard test suite. Manually triggered when an adapter
 * lands or when TikHub-side changes are suspected (per spec §6 operational
 * hygiene — per-platform success-rate monitoring starts here).
 *
 * Requires TIKHUB_API_KEY in env (loaded from .env when run via tsx -r dotenv/config).
 */

import { instagramAdapter } from './instagram';

const TEST_PROFILE = 'https://www.instagram.com/cristiano/';

async function main() {
  console.log(`[smoke] scraping ${TEST_PROFILE}`);
  const t0 = Date.now();
  const { profile, posts } = await instagramAdapter.scrape(TEST_PROFILE);
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
  if (!profile.followers || profile.followers < 1_000_000) {
    throw new Error(
      `Sanity fail: cristiano should have 600M+ followers, got ${profile.followers}`,
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
