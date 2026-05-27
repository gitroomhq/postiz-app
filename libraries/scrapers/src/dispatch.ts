/**
 * Adapter dispatch table.
 *
 * Single entry point used by the daily cron + manual trigger:
 *   const result = await runScraper('instagram', profileUrl)
 *
 * Adding platform #6 = create new adapter file + add line here. No other
 * code in the system needs to know which platform exists.
 *
 * v1 adapters are stubs — implemented one at a time per spec build order:
 * Instagram → TikTok → Facebook → RedNote → Douyin.
 */

import type { Platform, PlatformAdapter, ScrapeResult } from './types';

// Adapters are imported lazily inside runScraper() so the dispatch table
// doesn't pull every actor's parsing code into a single function bundle.
// (Vercel Function cold-start budget.)

const ADAPTER_LOADERS: Record<Platform, () => Promise<PlatformAdapter>> = {
  instagram: () =>
    import('./adapters/instagram').then((m) => m.instagramAdapter),
  tiktok: () => import('./adapters/tiktok').then((m) => m.tiktokAdapter),
  facebook: () => import('./adapters/facebook').then((m) => m.facebookAdapter),
  rednote: () => import('./adapters/rednote').then((m) => m.rednoteAdapter),
  douyin: () => import('./adapters/douyin').then((m) => m.douyinAdapter),
};

export async function runScraper(
  platform: Platform,
  profileUrl: string,
): Promise<ScrapeResult> {
  const loader = ADAPTER_LOADERS[platform];
  if (!loader) {
    throw new Error(`Unknown platform: ${platform}`);
  }
  const adapter = await loader();
  return adapter.scrape(profileUrl);
}

export const SUPPORTED_PLATFORMS: readonly Platform[] = Object.keys(
  ADAPTER_LOADERS,
) as Platform[];
