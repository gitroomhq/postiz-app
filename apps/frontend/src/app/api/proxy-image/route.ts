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
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
];

function isAllowedHost(host: string): boolean {
  const lower = host.toLowerCase();
  return ALLOWED_SUFFIXES.some((suffix) => lower.endsWith(suffix));
}

export async function GET(request: Request): Promise<Response> {
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const upstream = await fetch(target.toString(), {
      signal: controller.signal,
      // Important: no Referer (default in server-side fetch).
      headers: {
        // A vanilla UA matters for some CDNs that gate by User-Agent.
        'User-Agent':
          'Mozilla/5.0 (compatible; D3CreatorImageProxy/0.1; +https://d3-creator.vercel.app)',
        Accept: 'image/*,*/*;q=0.8',
      },
    });

    if (!upstream.ok) {
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
      return NextResponse.json(
        { error: 'upstream not an image', contentType },
        { status: 502 },
      );
    }

    const body = await upstream.arrayBuffer();
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, immutable',
        'X-Proxied-Host': target.hostname,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'proxy failed', detail: msg },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
