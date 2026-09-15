import type { Metadata } from 'next';

/**
 * Same sentence the root layout already puts in <meta name="description">.
 * Kept here so auth pages can set og:title / og:description explicitly
 * without inheriting "Login · PostQueen" as the share card title.
 */
export const AUTH_OG_DESCRIPTION =
  'Schedule and generate posts with AI across 30+ social and chat channels.';

/** Public PNG in apps/frontend/public — the SVG favicon is not an og:image. */
export const AUTH_OG_IMAGE_PATH = '/og-image.png';

export const AUTH_OG_IMAGE = {
  url: AUTH_OG_IMAGE_PATH,
  width: 1200,
  height: 630,
  alt: 'PostQueen',
  type: 'image/png',
} as const;

/**
 * App A — PostQueen Facebook. Not Instagram (App B) or Threads (App C).
 * Next.js `facebook.appId` renders `<meta property="fb:app_id" … />`.
 */
export const FACEBOOK_OG_APP_ID = '1987692731891592';

/**
 * Facebook's Sharing Debugger scrapes `https://app.postqueen.ai/` and may
 * parse that first response without following the logged-out 307 to
 * `/auth/login`. A redirect body is not HTML, so `/` has to render the
 * share tags itself. Org-join (`?org=`) still 307s — that flow sets a cookie.
 */
export function unauthenticatedRootNeedsShareHtml(
  pathname: string,
  options: { hasAuth: boolean; hasOrgQuery: boolean }
): boolean {
  if (options.hasAuth || options.hasOrgQuery) return false;
  return pathname === '/' || pathname === '';
}

export function authShareMetadata(
  url: string
): Pick<Metadata, 'description' | 'openGraph' | 'twitter' | 'facebook'> {
  return {
    description: AUTH_OG_DESCRIPTION,
    openGraph: {
      title: 'PostQueen',
      description: AUTH_OG_DESCRIPTION,
      url,
      type: 'website',
      siteName: 'PostQueen',
      images: [AUTH_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'PostQueen',
      description: AUTH_OG_DESCRIPTION,
      images: [AUTH_OG_IMAGE_PATH],
    },
    facebook: {
      appId: FACEBOOK_OG_APP_ID,
    },
  };
}
