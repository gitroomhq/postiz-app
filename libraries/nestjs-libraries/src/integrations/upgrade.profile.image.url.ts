/**
 * Providers often hand back a thumbnail URL. Channel avatars are shown larger
 * than that, so we rewrite only size tokens the CDNs already document.
 *
 * - X: `_normal` (48×48), `_bigger` (73×73), `_mini` (24×24) → `_400x400`
 * - Google userinfo: `=s96-c` (and other sub-400 `sNN-c`) → `=s400-c`
 *
 * Signed CDNs (TikTok, Facebook lookaside, LinkedIn shrink paths) are left
 * alone — changing those params would 403. Facebook/Instagram Graph calls
 * request `picture.type(large)` instead; YouTube uses `thumbnails.high`.
 */
export function upgradeProfileImageUrl(url?: string | null): string {
  if (!url) {
    return '';
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host === 'twimg.com' || host.endsWith('.twimg.com')) {
      return upgradeXProfileImageUrl(url, parsed);
    }

    if (
      host === 'googleusercontent.com' ||
      host.endsWith('.googleusercontent.com')
    ) {
      return upgradeGoogleProfileImageUrl(url, parsed);
    }
  } catch {
    return url;
  }

  return url;
}

function upgradeXProfileImageUrl(original: string, parsed: URL): string {
  const nextPath = parsed.pathname.replace(
    /_(normal|bigger|mini)(\.[a-zA-Z0-9]+)$/i,
    '_400x400$2'
  );
  const name = parsed.searchParams.get('name');
  const nextName =
    name && /^(normal|bigger|mini)$/i.test(name) ? '400x400' : name;

  if (nextPath === parsed.pathname && nextName === name) {
    return original;
  }

  parsed.pathname = nextPath;
  if (nextName && nextName !== name) {
    parsed.searchParams.set('name', nextName);
  }

  return parsed.toString();
}

function upgradeGoogleProfileImageUrl(original: string, parsed: URL): string {
  const nextPath = parsed.pathname.replace(
    /=s(48|50|64|72|96|128)(-c)/,
    '=s400$2'
  );

  if (nextPath === parsed.pathname) {
    return original;
  }

  parsed.pathname = nextPath;
  return parsed.toString();
}

export function youtubeChannelPictureUrl(thumbnails?: {
  high?: { url?: string | null };
  medium?: { url?: string | null };
  default?: { url?: string | null };
} | null): string {
  return (
    thumbnails?.high?.url ||
    thumbnails?.medium?.url ||
    thumbnails?.default?.url ||
    ''
  );
}
