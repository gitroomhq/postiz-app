/**
 * Central TikHub REST service.
 *
 * Every TikHub-backed adapter (instagram / tiktok / douyin / rednote) calls
 * tikhubGet() — no direct fetch() in adapter files. Single chokepoint for:
 *   - API key handling (TIKHUB_API_KEY env, fail-fast on missing)
 *   - error normalization (404 → not_found, 429 → throttled, 5xx → failed)
 *   - timeouts (default 30s — TikHub is fast; profiles return in ~1-3s)
 *   - envelope unwrapping (TikHub responses are {code, data, message})
 *
 * Path convention mirrors the MCP tool names in .mcp.json:
 *   mcp tool   tiktok_app_v3_handler_user_profile
 *   REST path  /api/v1/tiktok/app/v3/handler_user_profile
 *   (each underscore-separated segment becomes a path segment, except the
 *    final operation which keeps its underscores).
 *
 * Production runs in Vercel Functions; MCP tooling in .mcp.json is for
 * dev-time inspection only and does NOT exercise this code path.
 */

import {
  ProfileNotFoundError,
  ProfilePrivateError,
  ScrapeError,
} from './errors';

/** Override only for region routing (api.tikhub.dev for mainland CN). */
const DEFAULT_BASE = 'https://api.tikhub.io';

/** TikHub wraps everything in a {code, data, message} envelope. */
interface TikhubEnvelope<T> {
  code?: number;
  message?: string;
  data?: T;
  /** Some endpoints return params/router echoes — ignored here. */
  router?: string;
  params?: unknown;
}

export interface TikhubGetOptions {
  /** Path under base, e.g. '/api/v1/instagram/v3/get_user_profile'. */
  path: string;
  /** Query params. Undefined/empty values are dropped. */
  query: Record<string, string | number | undefined>;
  /** Platform tag for error messages. */
  platform: string;
  /** Profile URL — surfaced in error context. */
  profileUrl: string;
  /** Override timeout (ms). Default 30s. */
  timeoutMs?: number;
}

function getBaseUrl(): string {
  return process.env.TIKHUB_API_BASE || DEFAULT_BASE;
}

function requireToken(): string {
  const token = process.env.TIKHUB_API_KEY;
  if (!token) {
    throw new Error(
      'TIKHUB_API_KEY env var is required. Set it in .env (local) or Vercel project env (prod). See .env.example.',
    );
  }
  return token;
}

function buildUrl(path: string, query: TikhubGetOptions['query']): string {
  const url = new URL(path, getBaseUrl());
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    url.searchParams.set(k, String(v));
  }
  return url.toString();
}

function looksLikeNotFound(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes('not found') ||
    m.includes('does not exist') ||
    m.includes('no such user') ||
    m.includes("couldn't find") ||
    m.includes('invalid user') ||
    m.includes('user id') && m.includes('invalid')
  );
}

function looksLikePrivate(msg: string): boolean {
  const m = msg.toLowerCase();
  return m.includes('private') || m.includes('restricted') || m.includes('blocked');
}

/**
 * GET a TikHub endpoint and return the unwrapped `data` payload.
 *
 * Throws ScrapeError subclasses on failure so adapters can let errors bubble
 * straight up to the cron's status-mapping layer without per-platform glue.
 */
export async function tikhubGet<T = unknown>(
  opts: TikhubGetOptions,
): Promise<T> {
  const token = requireToken();
  const url = buildUrl(opts.path, opts.query);

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), opts.timeoutMs ?? 30000);

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      signal: ac.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const isAbort =
      err instanceof DOMException && err.name === 'AbortError';
    throw new ScrapeError(
      'failed',
      isAbort
        ? 'TikHub request timed out'
        : `TikHub fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      opts.platform,
      opts.profileUrl,
    );
  }
  clearTimeout(timer);

  if (res.status === 401 || res.status === 403) {
    // Don't leak token state — caller logs platform + URL only.
    throw new ScrapeError(
      'failed',
      `TikHub auth rejected (${res.status}) — check TIKHUB_API_KEY`,
      opts.platform,
      opts.profileUrl,
    );
  }
  if (res.status === 402) {
    // Billing / quota — surface clearly so operators don't waste time
    // debugging the code path.
    throw new ScrapeError(
      'failed',
      `TikHub returned 402 — out of credits or endpoint not in plan tier (path=${opts.path})`,
      opts.platform,
      opts.profileUrl,
    );
  }
  if (res.status === 429) {
    throw new ScrapeError(
      'throttled',
      'TikHub rate-limited the request (429)',
      opts.platform,
      opts.profileUrl,
    );
  }
  if (res.status === 404) {
    throw new ProfileNotFoundError(opts.platform, opts.profileUrl);
  }
  if (!res.ok) {
    throw new ScrapeError(
      'failed',
      `TikHub returned HTTP ${res.status}`,
      opts.platform,
      opts.profileUrl,
    );
  }

  let body: TikhubEnvelope<T>;
  try {
    body = (await res.json()) as TikhubEnvelope<T>;
  } catch {
    throw new ScrapeError(
      'failed',
      'TikHub returned non-JSON body',
      opts.platform,
      opts.profileUrl,
    );
  }

  if (body.code !== undefined && body.code !== 200 && body.code !== 0) {
    const msg = body.message || `code=${body.code}`;
    if (looksLikePrivate(msg)) {
      throw new ProfilePrivateError(opts.platform, opts.profileUrl);
    }
    if (looksLikeNotFound(msg) || body.code === 404) {
      throw new ProfileNotFoundError(opts.platform, opts.profileUrl);
    }
    if (body.code === 429) {
      throw new ScrapeError(
        'throttled',
        `TikHub envelope rate-limit: ${msg}`,
        opts.platform,
        opts.profileUrl,
      );
    }
    throw new ScrapeError(
      'failed',
      `TikHub envelope error: ${msg}`,
      opts.platform,
      opts.profileUrl,
    );
  }

  if (body.data === undefined || body.data === null) {
    throw new ScrapeError(
      'failed',
      'TikHub returned empty data payload',
      opts.platform,
      opts.profileUrl,
    );
  }
  return body.data;
}
