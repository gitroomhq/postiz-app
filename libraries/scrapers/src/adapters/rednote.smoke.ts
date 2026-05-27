/**
 * Live smoke test — costs Apify compute units.
 * Run: pnpm exec tsx libraries/scrapers/src/adapters/rednote.smoke.ts
 *
 * NOT part of the standard test suite. Manually triggered when an adapter
 * lands or when Apify-side changes are suspected (per spec §6 operational
 * hygiene — per-platform success-rate monitoring starts here).
 *
 * Note on the RedNote adapter's profile snapshot:
 * The chosen actor (easyapi/all-in-one-rednote-xiaohongshu-scraper) in
 * userPosts mode does not return follower-side counters. profile.followers
 * is null by design — see rednote.ts header. The sanity gate below
 * proxies "real active account" via post count + top-post likes rather
 * than profile.followers.
 */

import { rednoteAdapter } from './rednote';

// TODO(rednote): fill in a verified active Xiaohongshu profile URL before
// running.
//
// Why this is a TODO instead of a baked-in URL: Xiaohongshu user IDs are
// 24-char hex strings (MongoDB ObjectIds) with no public directory. The
// first attempt at this smoke (595082c750c4b41a466d18b1, intended to be
// Fan Bingbing / 范冰冰) returned HTTP 404 on the public web — the URL
// was guessed and was wrong, and the Apify run returned zero items.
//
// Adapter code itself is sound: the actor input schema was verified via
// WebFetch against the actor's published schema page, and the field
// names (mode/profileUrls/maxItems) all match. A verified live profile
// URL is what's missing.
//
// To populate: open xiaohongshu.com in a browser, find a high-engagement
// public account (lifestyle/beauty/food influencers are most discoverable),
// and copy the URL from the address bar. Format:
//   https://www.xiaohongshu.com/user/profile/<24-char-hex-id>
const TEST_PROFILE =
  'https://www.xiaohongshu.com/user/profile/REPLACE_WITH_REAL_USER_ID';

async function main() {
  if (TEST_PROFILE.includes('REPLACE_WITH_REAL_USER_ID')) {
    throw new Error(
      'rednote.smoke: TEST_PROFILE not configured — see TODO above. ' +
        'Fill in a verified Xiaohongshu profile URL before running.',
    );
  }

  console.log(`[smoke] scraping ${TEST_PROFILE}`);
  const t0 = Date.now();
  const { profile, posts } = await rednoteAdapter.scrape(TEST_PROFILE);
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

  // Sanity gates — this adapter does not return follower counts (see header),
  // so we gate on posts arriving and a recognisable embedded user identity.
  if (posts.length === 0) {
    throw new Error('Sanity fail: expected >=1 post');
  }
  const rawProfile = profile.raw as { userId?: string; nickname?: string };
  if (!rawProfile?.userId || !rawProfile?.nickname) {
    throw new Error(
      `Sanity fail: expected embedded userId+nickname in profile.raw, got ${JSON.stringify(
        rawProfile,
      )}`,
    );
  }
  // The task asks for a 100K-follower-equivalent gate. Since we cannot
  // observe followers via this actor, we proxy it with engagement on the
  // most-liked recent post: a 100K+ follower account should comfortably
  // have at least one post with >=1000 likes in its latest 30.
  const topLikes = posts.reduce((m, p) => Math.max(m, p.likes ?? 0), 0);
  if (topLikes < 1000) {
    throw new Error(
      `Sanity fail: top-liked post had ${topLikes} likes — expected >=1000 for a major public account`,
    );
  }
  console.log('[smoke] PASS');
}

main().catch((err) => {
  console.error('[smoke] FAIL', err);
  process.exit(1);
});
