/**
 * Live smoke test — costs TikHub API credits.
 * Run: pnpm exec tsx libraries/scrapers/src/adapters/douyin.smoke.ts
 *
 * NOT part of the standard test suite. Manually triggered when an adapter
 * lands or when TikHub-side changes are suspected (per spec §6 operational
 * hygiene — per-platform success-rate monitoring starts here).
 *
 * Requires TIKHUB_API_KEY in env.
 */

import { douyinAdapter } from './douyin';

// TODO(douyin): fill in a verified large-creator Douyin URL before running.
//
// Why this is a TODO instead of a baked-in URL: Douyin profile URLs are
// keyed on `secUid` — an opaque ~70-char base64 string with no public
// directory. I cannot produce a verified sec_uid for a known creator from
// memory without risking pointing at the wrong account.
//
// To populate: open douyin.com in a browser, navigate to a verified big
// account (e.g. 刘畊宏 / Liu Genghong, 疯狂小杨哥, 多余和毛毛姐 — any
// 5M+-follower creator), and paste the resulting URL here. Examples of
// formats the actor accepts:
//   https://www.douyin.com/user/MS4wLjABAAAA<long-base64>
//   https://v.douyin.com/<short-id>/                    (mobile share)
//   <bare secUid>                                       (UserSecID alone)
//   <numeric user id>
const TEST_PROFILE = 'https://www.douyin.com/user/REPLACE_WITH_REAL_SEC_UID';

async function main() {
  if (TEST_PROFILE.includes('REPLACE_WITH_REAL_SEC_UID')) {
    throw new Error(
      'douyin.smoke: TEST_PROFILE not configured — see TODO above. ' +
        'Fill in a verified Douyin user URL before running.',
    );
  }

  console.log(`[smoke] scraping ${TEST_PROFILE}`);
  const t0 = Date.now();
  const { profile, posts } = await douyinAdapter.scrape(TEST_PROFILE);
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
  if (!profile.followers || profile.followers < 500_000) {
    throw new Error(
      `Sanity fail: test profile should have 500K+ followers, got ${profile.followers}`,
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
