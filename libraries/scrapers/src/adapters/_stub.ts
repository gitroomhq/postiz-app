/**
 * Helper used by not-yet-implemented platform adapters.
 *
 * Per spec build order (Instagram → TikTok → Facebook → RedNote → Douyin)
 * adapters land one at a time. Until each is real, dispatch.ts still
 * compiles and the orchestrator gets a clear ScrapeError ('failed') if it
 * ever tries to invoke an un-shipped platform.
 */

import { ScrapeError } from '../errors';
import type { PlatformAdapter, ScrapeResult } from '../types';

export function notYetImplemented(
  platform: PlatformAdapter['platform'],
  actorId: string,
): PlatformAdapter {
  return {
    platform,
    actorId,
    async scrape(profileUrl: string): Promise<ScrapeResult> {
      throw new ScrapeError(
        'failed',
        `Adapter for "${platform}" not yet implemented (Task 4 — build order: IG → TikTok → FB → RedNote → Douyin)`,
        platform,
        profileUrl,
      );
    },
  };
}
