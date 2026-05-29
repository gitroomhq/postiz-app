/**
 * Profile URL parsing + validation.
 *
 * Two responsibilities:
 *  1. detectPlatform(url) — auto-fill the Add Profile modal's platform
 *     dropdown (per spec Section 3 step 1).
 *  2. validateProfileUrl(platform, url) — ensure the URL actually matches
 *     the platform before we save it. Also extracts the public handle so
 *     it can be stored in profile.handle.
 *
 * Patterns are intentionally permissive — Apify actors are robust to query
 * strings, trailing slashes, www. prefixes. Reject only genuinely wrong
 * inputs (cross-platform mismatch, non-profile URLs like /posts/123).
 */

import type { Platform } from './types';

interface PlatformPattern {
  platform: Platform;
  /** Used by detectPlatform — must match the host portion. */
  hostMatch: RegExp;
  /** Used by validateProfileUrl — must capture the handle. */
  handleExtract: RegExp;
}

const PATTERNS: PlatformPattern[] = [
  {
    platform: 'instagram',
    hostMatch: /(^|\.)instagram\.com$/i,
    // /@handle or /handle (no /p/, /reel/, /tv/ — those are post URLs)
    handleExtract: /^\/(?!p\/|reel\/|tv\/|explore\/|stories\/)@?([A-Za-z0-9._]+)\/?$/,
  },
  {
    platform: 'tiktok',
    hostMatch: /(^|\.)tiktok\.com$/i,
    // /@handle or /@handle/video/... — accept profile root only
    handleExtract: /^\/@([A-Za-z0-9._]+)\/?$/,
  },
  {
    platform: 'facebook',
    hostMatch: /(^|\.)(facebook|fb)\.com$/i,
    // /handle or /pages/Name/123... or /profile.php?id=123 (handled separately)
    handleExtract: /^\/(?!share|reel|posts|watch|groups|events|story\.php)([A-Za-z0-9.\-]+)\/?$/,
  },
  {
    platform: 'rednote',
    hostMatch: /(^|\.)(xiaohongshu|xhslink)\.com$/i,
    // /user/profile/<id>
    handleExtract: /^\/user\/profile\/([A-Za-z0-9]+)\/?$/,
  },
  {
    platform: 'douyin',
    hostMatch: /(^|\.)douyin\.com$/i,
    // /user/<sec_uid> — long alphanumeric
    handleExtract: /^\/user\/([A-Za-z0-9_-]+)\/?$/,
  },
];

/** Detect platform from URL host. Returns null if no match. */
export function detectPlatform(rawUrl: string): Platform | null {
  let u: URL;
  try {
    u = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  const found = PATTERNS.find((p) => p.hostMatch.test(u.hostname));
  return found?.platform ?? null;
}

export interface ProfileUrlValidation {
  ok: true;
  platform: Platform;
  /** Normalized form: lowercased host, no query/hash, no trailing slash. */
  normalizedUrl: string;
  /** Public handle / numeric id pulled from the path. */
  handle: string;
}

export interface ProfileUrlValidationError {
  ok: false;
  error: string;
}

/**
 * Validate a profile URL is well-formed AND matches the asserted platform.
 * Special-cases facebook.com/profile.php?id=... since the id sits in query.
 */
export function validateProfileUrl(
  platform: Platform,
  rawUrl: string,
): ProfileUrlValidation | ProfileUrlValidationError {
  const trimmed = rawUrl.trim();
  if (!trimmed) return { ok: false, error: 'URL is required' };

  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return { ok: false, error: 'URL is malformed' };
  }

  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { ok: false, error: 'URL must use http(s)' };
  }

  // xhslink.com is RedNote's short-link redirector. The scraper extracts the
  // user_id from xiaohongshu.com/user/profile/<id>, so a short link passes
  // host validation but fails extraction on every cron — permanent `failed`.
  // Reject up-front and tell the user to paste the full profile URL.
  // (Following the redirect at validation time is out of scope.)
  if (platform === 'rednote' && /(^|\.)xhslink\.com$/i.test(u.hostname)) {
    return {
      ok: false,
      error:
        'xhslink.com short links are not supported. Open the link in a browser and paste the full xiaohongshu.com/user/profile/<id> URL.',
    };
  }

  const pattern = PATTERNS.find((p) => p.platform === platform);
  if (!pattern) {
    return { ok: false, error: `Unknown platform: ${platform}` };
  }
  if (!pattern.hostMatch.test(u.hostname)) {
    return {
      ok: false,
      error: `URL host "${u.hostname}" does not match platform ${platform}`,
    };
  }

  // FB profile.php?id=12345 — handle lives in query, not path
  if (platform === 'facebook' && u.pathname === '/profile.php') {
    const id = u.searchParams.get('id');
    if (!id || !/^\d+$/.test(id)) {
      return { ok: false, error: 'Facebook profile.php URL missing numeric ?id=' };
    }
    return {
      ok: true,
      platform,
      normalizedUrl: `https://www.facebook.com/profile.php?id=${id}`,
      handle: id,
    };
  }

  const m = u.pathname.match(pattern.handleExtract);
  if (!m) {
    return {
      ok: false,
      error: `URL path "${u.pathname}" is not a ${platform} profile (expected profile root, not a post/reel/page section)`,
    };
  }

  const handle = m[1];
  const normalizedUrl = `https://${u.hostname.toLowerCase()}${u.pathname.replace(/\/+$/, '')}`;
  return { ok: true, platform, normalizedUrl, handle };
}

/**
 * Fold a handle for cross-platform fuzzy matching used by Auto-Discovery.
 *
 * Steps:
 *  1. lowercase
 *  2. strip separators (. _ -) since they're cosmetic across platforms
 *     (e.g. "j.smith" on IG vs "jsmith" on TikTok vs "j_smith" on Douyin)
 *  3. strip trailing platform-suffix conventions ("official", "real", "tv",
 *     "ig", "tt") creators commonly add to disambiguate alt accounts
 *
 * Returns the folded form. Empty input → "".
 *
 * Mirrors the profile_handle_folded index expression in migration
 * 20260529000001_profile_claim.sql so SQL = TS produces the same value.
 */
export function normalizeHandle(handle: string | null | undefined): string {
  if (!handle) return '';
  const lowered = handle.toLowerCase();
  const stripped = lowered.replace(/[._\-]+/g, '');
  return stripped.replace(/(official|real|tv|ig|tt)$/i, '');
}

