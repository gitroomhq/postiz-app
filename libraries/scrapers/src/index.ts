/**
 * @d3/scrapers — public surface.
 *
 * Consumers (Vercel Functions, cron, tests) only import from this barrel.
 * Never import from internal files directly — keeps the contract narrow.
 */

export { runScraper, SUPPORTED_PLATFORMS } from './dispatch';
export { runActor, getApifyClient } from './apify-client';
export {
  ScrapeError,
  ApifyTimeoutError,
  ApifyEmptyResultError,
  ApifyThrottledError,
  ProfilePrivateError,
  ProfileNotFoundError,
  type ScrapeStatusCode,
} from './errors';
export type {
  Platform,
  PlatformAdapter,
  ScrapeResult,
  NormalizedProfileSnapshot,
  NormalizedPostSnapshot,
  ContentType,
} from './types';
