/**
 * Central Bright Data Web Scraper API service.
 *
 * Used by the Facebook adapter (Bright Data has prebuilt FB datasets that
 * surface profile counters TikHub/other backends do not). Mirrors the
 * tikhub-client.ts patterns:
 *   - API key handling (BRIGHTDATA_API_KEY env, fail-fast on missing)
 *   - error normalization (404 → not_found, 429 → throttled, 5xx → failed)
 *   - timeouts (default 5 min — matches cron maxDuration)
 *   - polling (5s interval — most FB scrapes resolve in 30s-2min)
 *
 * Bright Data Web Scraper API flow (https://api.brightdata.com/datasets/v3):
 *   1. POST /trigger?dataset_id=<id>&format=json&include_errors=true
 *        body: [{ url: "<profile_url>" }]
 *        → 200 { snapshot_id: "s_..." }
 *   2. GET /progress/<snapshot_id>
 *        → 200 { status: "running" | "ready" | "failed", records?: number }
 *   3. GET /snapshot/<snapshot_id>?format=json
 *        → 200 [{ ...item }, ...]
 *
 * Production runs in Vercel Functions.
 */

import { ProfileNotFoundError, ScrapeError } from './errors';

const DEFAULT_BASE = 'https://api.brightdata.com/datasets/v3';

type ProgressStatus = 'running' | 'ready' | 'failed' | 'collecting' | 'building';

interface ProgressResponse {
  status?: ProgressStatus;
  records?: number;
  errors?: number;
  message?: string;
}

interface TriggerResponse {
  snapshot_id?: string;
}

export interface RunDatasetOptions {
  /** Bright Data dataset_id, e.g. 'gd_lkay758p1eanlolqw8'. */
  datasetId: string;
  /** Items to scrape — each becomes one row in the result snapshot. */
  inputs: Array<{ url: string } | Record<string, unknown>>;
  /** Platform tag for error messages. */
  platform: string;
  /** Profile URL — surfaced in error context. */
  profileUrl: string;
  /** Total budget in ms. Default 300_000 (5 min). */
  timeoutMs?: number;
  /** Poll interval in ms. Default 5_000 (5 s). */
  pollIntervalMs?: number;
}

function getBaseUrl(): string {
  return process.env.BRIGHTDATA_API_BASE || DEFAULT_BASE;
}

function requireToken(): string {
  const token = process.env.BRIGHTDATA_API_KEY;
  if (!token) {
    throw new Error(
      'BRIGHTDATA_API_KEY env var is required. Set it in .env (local) or Vercel project env (prod). See .env.example.',
    );
  }
  return token;
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${requireToken()}`,
    Accept: 'application/json',
  };
}

function looksLikeNotFound(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes('not found') ||
    m.includes('does not exist') ||
    m.includes('no records') ||
    m.includes('404')
  );
}

function looksLikePrivate(msg: string): boolean {
  const m = msg.toLowerCase();
  return m.includes('private') || m.includes('restricted') || m.includes('login required');
}

async function brightdataFetch(
  method: 'GET' | 'POST',
  path: string,
  platform: string,
  profileUrl: string,
  body?: unknown,
): Promise<Response> {
  const url = new URL(path, getBaseUrl() + '/').toString();
  const headers: Record<string, string> = authHeaders();
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new ScrapeError(
      'failed',
      `Bright Data fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      platform,
      profileUrl,
    );
  }

  if (res.status === 401 || res.status === 403) {
    throw new ScrapeError(
      'failed',
      `Bright Data auth rejected (${res.status}) — check BRIGHTDATA_API_KEY`,
      platform,
      profileUrl,
    );
  }
  if (res.status === 402) {
    throw new ScrapeError(
      'failed',
      `Bright Data returned 402 — out of credits or dataset not in plan`,
      platform,
      profileUrl,
    );
  }
  if (res.status === 429) {
    throw new ScrapeError(
      'throttled',
      'Bright Data rate-limited the request (429)',
      platform,
      profileUrl,
    );
  }
  if (res.status === 404) {
    // 404 here means the dataset_id / snapshot_id was unknown — not a
    // missing profile. Surface as 'failed' so the cron retries next day
    // rather than marking the profile not_found.
    throw new ScrapeError(
      'failed',
      `Bright Data 404 on ${path} — dataset_id or snapshot_id invalid`,
      platform,
      profileUrl,
    );
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ScrapeError(
      'failed',
      `Bright Data HTTP ${res.status} on ${path}: ${text.slice(0, 200)}`,
      platform,
      profileUrl,
    );
  }
  return res;
}

async function triggerScrape(opts: RunDatasetOptions): Promise<string> {
  const path = `trigger?dataset_id=${encodeURIComponent(opts.datasetId)}&format=json&include_errors=true`;
  const res = await brightdataFetch('POST', path, opts.platform, opts.profileUrl, opts.inputs);
  const body = (await res.json()) as TriggerResponse;
  if (!body.snapshot_id) {
    throw new ScrapeError(
      'failed',
      `Bright Data trigger returned no snapshot_id: ${JSON.stringify(body)}`,
      opts.platform,
      opts.profileUrl,
    );
  }
  return body.snapshot_id;
}

async function pollProgress(
  snapshotId: string,
  opts: RunDatasetOptions,
): Promise<void> {
  const budget = opts.timeoutMs ?? 300_000;
  const interval = opts.pollIntervalMs ?? 5_000;
  const deadline = Date.now() + budget;

  while (Date.now() < deadline) {
    const res = await brightdataFetch(
      'GET',
      `progress/${encodeURIComponent(snapshotId)}`,
      opts.platform,
      opts.profileUrl,
    );
    const body = (await res.json()) as ProgressResponse;
    const status = (body.status || '').toLowerCase();

    if (status === 'ready') return;
    if (status === 'failed') {
      const msg = body.message || 'collector failed';
      if (looksLikePrivate(msg)) {
        // Re-throw via the higher-level adapter check — keep client generic.
        throw new ScrapeError('private', `Bright Data: ${msg}`, opts.platform, opts.profileUrl);
      }
      if (looksLikeNotFound(msg)) {
        throw new ProfileNotFoundError(opts.platform, opts.profileUrl);
      }
      throw new ScrapeError('failed', `Bright Data: ${msg}`, opts.platform, opts.profileUrl);
    }
    // running / collecting / building → keep polling
    await new Promise((r) => setTimeout(r, interval));
  }

  throw new ScrapeError(
    'failed',
    `Bright Data snapshot ${snapshotId} did not become ready within ${budget}ms`,
    opts.platform,
    opts.profileUrl,
  );
}

async function fetchSnapshot<T>(
  snapshotId: string,
  opts: RunDatasetOptions,
): Promise<T[]> {
  const res = await brightdataFetch(
    'GET',
    `snapshot/${encodeURIComponent(snapshotId)}?format=json`,
    opts.platform,
    opts.profileUrl,
  );
  const body = (await res.json()) as T[] | { data?: T[] };
  if (Array.isArray(body)) return body;
  // Some endpoints wrap in { data: [...] } — tolerate.
  if (body && Array.isArray((body as { data?: T[] }).data)) {
    return (body as { data: T[] }).data;
  }
  throw new ScrapeError(
    'failed',
    'Bright Data snapshot returned non-array payload',
    opts.platform,
    opts.profileUrl,
  );
}

/**
 * Run a Bright Data Web Scraper dataset end-to-end:
 * trigger → poll until ready → fetch snapshot items.
 */
export async function runDataset<T = unknown>(opts: RunDatasetOptions): Promise<T[]> {
  const snapshotId = await triggerScrape(opts);
  await pollProgress(snapshotId, opts);
  return fetchSnapshot<T>(snapshotId, opts);
}
