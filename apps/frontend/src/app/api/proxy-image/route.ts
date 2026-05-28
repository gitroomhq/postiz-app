/**
 * Image proxy — pipes whitelisted social-CDN URLs through our origin.
 *
 * Why: IG/TikTok/Facebook/Douyin/RedNote CDNs sign their image URLs with
 * short-lived tokens. They also frequently return 403 when the request
 * carries a Referer header pointing at any origin they don't recognize.
 * Loading those URLs directly from the user's browser fails within minutes
 * of being scraped.
 *
 * Resolution: server-to-server fetch from this route. No browser Referer,
 * and the CDN's own response is then served from our origin (cacheable by
 * Vercel's CDN).
 *
 * Hardening:
 *   - Strict host whitelist (no SSRF — never accept arbitrary URLs).
 *   - URL must be valid HTTPS.
 *   - 8-second upstream timeout.
 *   - Response forwarded with the CDN's content-type, plus aggressive
 *     immutable caching for 1 day (signed URLs change, but the underlying
 *     image bytes for a given URL don't).
 *   - Optional per-IP rate limit via Upstash. Inert until
 *     UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set in env
 *     (Vercel Marketplace integration auto-injects these). Sliding
 *     window of 30 req per 10s — generous for any real user loading a
 *     page, hostile to a bot trying to bounce signed URLs through our
 *     compute budget.
 */

import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Lazily constructed rate limiter. We instantiate at module load so the
 * Upstash client connection is reused across invocations of this Function
 * (Fluid Compute pins state across requests when warm). If the env vars
 * aren't set — local dev without the Marketplace integration, or before
 * it's been provisioned in production — `ratelimit` stays null and the
 * guard becomes a no-op.
 */
const ratelimit: Ratelimit | null =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(30, '10 s'),
        analytics: false,
        prefix: 'proxy-image',
      })
    : null;

/**
 * Allowed host suffixes. Match the IG/TikTok/FB/Douyin/RedNote CDNs.
 * Wildcard subdomain matching done via .endsWith().
 */
const ALLOWED_SUFFIXES = [
  '.cdninstagram.com',
  '.fbcdn.net',          // Facebook + Instagram fallback CDN
  '.tiktokcdn.com',
  '.tiktokcdn-us.com',
  '.muscdn.com',         // Douyin / TikTok media
  '.xhscdn.com',         // RedNote / Xiaohongshu CDN
  '.rednotecdn.com',     // RedNote thumbnails surfaced by TikHub adapter
  '.douyinpic.com',      // Douyin thumbnails surfaced by TikHub adapter
];

function isAllowedHost(host: string): boolean {
  const lower = host.toLowerCase();
  return ALLOWED_SUFFIXES.some((suffix) => lower.endsWith(suffix));
}

/**
 * Some IG images are served from `*.fna.fbcdn.net` — Facebook Network
 * Appliance hosts that are geo-pinned to a *viewer's* region and not globally
 * DNS-resolvable. Server-side fetch from Vercel fails with ENOTFOUND.
 *
 * The Meta signature in the URL (`oh`, `oe`, `_nc_*`) is host-agnostic, so
 * we can swap the host to a globally-resolvable IG edge and the signed URL
 * still validates. Verified live 2026-05-27: scontent.cdninstagram.com
 * returns the identical bytes (Content-Digest match).
 */
function rewriteHostForFetch(target: URL): URL {
  if (target.hostname.toLowerCase().endsWith('.fna.fbcdn.net')) {
    const rewritten = new URL(target.toString());
    rewritten.hostname = 'scontent.cdninstagram.com';
    return rewritten;
  }
  return target;
}

/**
 * Best-effort caller IP for rate-limiting. Vercel always populates
 * x-forwarded-for upstream of the function; the first entry is the
 * originating client. The fallback only fires in local dev / missing
 * header — we use a placeholder so all those requests share a single
 * bucket rather than escaping the limiter entirely.
 */
function callerIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export async function GET(request: Request): Promise<Response> {
  // Rate limit early — before we parse the URL or touch the upstream. A
  // 429 here costs less than the URL validation, even though the limiter
  // itself is a remote Redis call. When ratelimit is null (no env vars
  // set), this is free.
  if (ratelimit) {
    const { success, limit, remaining, reset } = await ratelimit.limit(
      callerIp(request),
    );
    if (!success) {
      return new NextResponse('rate limited', {
        status: 429,
        headers: {
          'Retry-After': Math.max(0, Math.ceil((reset - Date.now()) / 1000)).toString(),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining),
        },
      });
    }
  }

  const u = new URL(request.url);
  const raw = u.searchParams.get('url');
  if (!raw) {
    return NextResponse.json({ error: 'missing url param' }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: 'malformed url' }, { status: 400 });
  }
  if (target.protocol !== 'https:') {
    return NextResponse.json({ error: 'https only' }, { status: 400 });
  }
  if (!isAllowedHost(target.hostname)) {
    return NextResponse.json(
      { error: 'host not allowed', host: target.hostname },
      { status: 400 },
    );
  }

  const fetchTarget = rewriteHostForFetch(target);
  // Header-receipt timeout. Once upstream sends response headers the fetch
  // promise resolves; from that point the streamed body is independent and
  // the abort signal stops being relevant — so we clear the timer before
  // returning the streaming Response. 8s is plenty for a CDN to start
  // sending headers; the body itself can take longer for large media.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  let upstream: Response;
  try {
    upstream = await fetch(fetchTarget.toString(), {
      signal: controller.signal,
      // Important: no Referer (default in server-side fetch).
      headers: {
        // A vanilla UA matters for some CDNs that gate by User-Agent.
        'User-Agent':
          'Mozilla/5.0 (compatible; D3CreatorImageProxy/0.1; +https://d3-creator.vercel.app)',
        Accept: 'image/*,*/*;q=0.8',
      },
    });
  } catch (err) {
    clearTimeout(timeout);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'proxy failed', detail: msg },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    clearTimeout(timeout);
    return NextResponse.json(
      { error: 'upstream error', status: upstream.status },
      { status: 502 },
    );
  }

  const contentType =
    upstream.headers.get('content-type') ?? 'application/octet-stream';
  // Defensive: refuse non-image content-types (whitelist allows hosts, this
  // protects against the proxy being used for HTML/JS content).
  if (!contentType.startsWith('image/')) {
    clearTimeout(timeout);
    return NextResponse.json(
      { error: 'upstream not an image', contentType },
      { status: 502 },
    );
  }

  if (!upstream.body) {
    clearTimeout(timeout);
    return NextResponse.json({ error: 'upstream no body' }, { status: 502 });
  }

  // Headers verified. Clear timeout — body streaming begins immediately,
  // and the original 8s budget was only for header receipt.
  clearTimeout(timeout);

  // Stream upstream.body directly to the client. This is the latency win:
  // previously we awaited upstream.arrayBuffer() so the proxy waited for
  // the WHOLE response before sending byte one to the browser. Now the
  // browser starts receiving bytes the moment they arrive at the proxy.
  const headers: Record<string, string> = {
    'Content-Type': contentType,
    // Cache aggressively. Same-URL hits skip the function entirely on Vercel
    // CDN; in the browser they hit memory cache.
    'Cache-Control': 'public, max-age=86400, s-maxage=86400, immutable',
    'X-Proxied-Host': target.hostname,
    'X-Fetch-Host': fetchTarget.hostname,
  };
  const contentLength = upstream.headers.get('content-length');
  if (contentLength) headers['Content-Length'] = contentLength;
  // Forward validators so the browser can do conditional revalidation later.
  const etag = upstream.headers.get('etag');
  if (etag) headers['ETag'] = etag;
  const lastModified = upstream.headers.get('last-modified');
  if (lastModified) headers['Last-Modified'] = lastModified;

  return new Response(upstream.body, { status: 200, headers });
}
