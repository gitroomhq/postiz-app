/**
 * Central Apify service.
 *
 * Every adapter calls runActor() — no direct ApifyClient instantiation in
 * adapter files. This is the single chokepoint for:
 *  - API key handling (env var only, never hardcoded)
 *  - error normalization (timeout / throttled / empty / failed)
 *  - retry budgeting (caller decides; default = single attempt)
 *  - timeouts (default 5 min per Actor run)
 *
 * The daily cron is the only caller in v1. Manual trigger (Task 8) reuses
 * the same path.
 */

import { ApifyClient } from 'apify-client';

import {
  ApifyEmptyResultError,
  ApifyThrottledError,
  ApifyTimeoutError,
  ScrapeError,
} from './errors';

let cachedClient: ApifyClient | null = null;

/**
 * Get a memoized ApifyClient. Reads APIFY_API_KEY from env at first call.
 * Throws if env var is missing — fail-fast at process start, not mid-scrape.
 */
export function getApifyClient(): ApifyClient {
  if (cachedClient) return cachedClient;
  const token = process.env.APIFY_API_KEY;
  if (!token) {
    throw new Error(
      'APIFY_API_KEY env var is required. Set it in .env (local) or Vercel project env (prod). See .env.example.',
    );
  }
  cachedClient = new ApifyClient({ token });
  return cachedClient;
}

export interface RunActorOptions {
  /** Apify Actor ID, e.g. 'apify/instagram-scraper' */
  actorId: string;
  /** Input passed to the Actor. Shape is Actor-specific. */
  input: Record<string, unknown>;
  /** Max wait for Actor to finish, seconds. Default 300 (5 min). */
  timeoutSecs?: number;
  /** Platform name for error messages. */
  platform: string;
  /** Profile URL — used in error context. */
  profileUrl: string;
}

/**
 * Run an Apify Actor and return its dataset items.
 *
 * Errors are normalized to ScrapeError subclasses so adapters can throw
 * platform-agnostic failures and the orchestrator can map them to
 * scrape_status values.
 */
export async function runActor<T = unknown>(
  opts: RunActorOptions,
): Promise<T[]> {
  const { actorId, input, timeoutSecs = 300, platform, profileUrl } = opts;
  const client = getApifyClient();

  let run;
  try {
    run = await client.actor(actorId).call(input, {
      timeout: timeoutSecs,
      waitSecs: timeoutSecs,
    });
  } catch (err) {
    throw normalizeApifyError(err, platform, profileUrl);
  }

  if (!run) {
    throw new ApifyEmptyResultError(platform, profileUrl);
  }

  // Apify run statuses: READY | RUNNING | SUCCEEDED | FAILED | ABORTING |
  // ABORTED | TIMING-OUT. .call() waits for terminal status but if waitSecs
  // expires first, status may still be RUNNING/TIMING-OUT — treat as timeout.
  if (run.status === 'TIMING-OUT' || run.status === 'RUNNING') {
    throw new ApifyTimeoutError(platform, profileUrl);
  }

  if (run.status !== 'SUCCEEDED') {
    throw new ScrapeError(
      'failed',
      `Apify run ended with status=${run.status}`,
      platform,
      profileUrl,
    );
  }

  const dataset = await client.dataset<T>(run.defaultDatasetId).listItems();
  if (!dataset.items || dataset.items.length === 0) {
    throw new ApifyEmptyResultError(platform, profileUrl);
  }
  return dataset.items;
}

/**
 * Map raw Apify SDK errors to our taxonomy. Best-effort — the SDK does not
 * expose stable error codes, so we string-match on message.
 */
function normalizeApifyError(
  err: unknown,
  platform: string,
  profileUrl: string,
): Error {
  if (err instanceof ScrapeError) return err;
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (lower.includes('timeout') || lower.includes('timed out')) {
    return new ApifyTimeoutError(platform, profileUrl);
  }
  if (
    lower.includes('rate limit') ||
    lower.includes('rate-limit') ||
    lower.includes('throttle') ||
    lower.includes('429')
  ) {
    return new ApifyThrottledError(platform, profileUrl);
  }
  return new ScrapeError('failed', msg, platform, profileUrl);
}
