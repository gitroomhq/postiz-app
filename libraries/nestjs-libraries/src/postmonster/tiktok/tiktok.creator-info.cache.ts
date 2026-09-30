// postmonster: in-memory cache for TikTok creator_info/query responses
// (PRD TT-01: "retrieve the latest creator info", API limit 20 req/min per
// token - a short cache keeps composer opens cheap and stays fresh enough).
// TTL is 60 seconds by design.

import { TikTokCreatorInfo } from './tiktok.validation';

const TTL_MS = 60 * 1000;

interface CacheEntry {
  value: TikTokCreatorInfo;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

export function creatorInfoCacheKey(
  integrationId: string,
  accessToken: string
): string {
  return `${integrationId}:${accessToken.slice(-12)}`;
}

export function getCreatorInfoCache(key: string): TikTokCreatorInfo | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

export function setCreatorInfoCache(
  key: string,
  value: TikTokCreatorInfo
): void {
  cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

export function clearCreatorInfoCache(key?: string): void {
  if (key) {
    cache.delete(key);
    return;
  }
  cache.clear();
}
