import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCookieUrlFromDomain } from '@gitroom/helpers/subdomain/subdomain.management';
import acceptLanguage from 'accept-language';
import {
  cookieName,
  headerName,
  languages,
} from '@gitroom/react/translation/i18n.config';
acceptLanguage.languages(languages);

// D3 Creator proxy.
//
// Public-by-default: anyone can browse the showcase (homepage, dashboard,
// per-creator analytics, leaderboard, legal pages) without logging in.
//
// Only `/admin/*` requires auth. An unauthenticated visitor hitting any
// `/admin/*` URL gets bounced to `/admin/login` (built in Step 6; until then
// it falls back to Postiz's existing `/auth/login`).
//
// The Postiz `/auth/*` machinery is kept intact so the admin login flow has
// a working backend, but no public nav link points at it.
export async function proxy(request: NextRequest) {
  const nextUrl = request.nextUrl;
  const authCookie =
    request.cookies.get('auth') ||
    request.headers.get('auth') ||
    nextUrl.searchParams.get('loggedAuth');
  const lng = request.cookies.has(cookieName)
    ? acceptLanguage.get(request.cookies.get(cookieName).value)
    : acceptLanguage.get(
        request.headers.get('Accept-Language') ||
          request.headers.get('accept-language')
      );

  const requestHeaders = new Headers(request.headers);
  if (lng) {
    requestHeaders.set(headerName, lng);
  }

  const topResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (lng) {
    topResponse.headers.set(cookieName, lng);
  }

  // Postiz modal pages still require auth.
  if (nextUrl.pathname.startsWith('/modal/') && !authCookie) {
    return NextResponse.redirect(new URL(`/auth/login-required`, nextUrl.href));
  }

  // Static / asset passthroughs.
  if (
    nextUrl.pathname.startsWith('/uploads/') ||
    nextUrl.pathname.startsWith('/p/') ||
    nextUrl.pathname.startsWith('/provider/') ||
    nextUrl.pathname.startsWith('/icons/')
  ) {
    return topResponse;
  }

  if (
    nextUrl.pathname.startsWith('/integrations/social/') &&
    nextUrl.href.indexOf('state=login') === -1
  ) {
    return topResponse;
  }

  // Logout: clear cookie and bounce back to the public homepage.
  if (nextUrl.href.indexOf('/auth/logout') > -1) {
    const response = NextResponse.redirect(new URL('/', nextUrl.href));
    response.cookies.set('auth', '', {
      path: '/',
      ...(!process.env.NOT_SECURED
        ? {
            secure: true,
            httpOnly: true,
            sameSite: false,
          }
        : {}),
      maxAge: -1,
      domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
    });
    return response;
  }

  // D3 Creator: public self-signup is permanently disabled. The Postiz
  // `/auth/register` endpoint is hard-blocked here regardless of env config.
  // Visitors are routed to the admin login surface instead.
  if (nextUrl.pathname.startsWith('/auth/register')) {
    return NextResponse.redirect(new URL('/admin/login', nextUrl.href));
  }

  // Admin gate. Every `/admin/*` URL except the login page itself requires
  // a valid auth cookie. Unauth visitors → `/auth/login` (which the
  // `/admin/login` page also aliases to). Direct redirect avoids a
  // double-hop when admins click the public nav's "Admin" link.
  if (
    nextUrl.pathname.startsWith('/admin') &&
    nextUrl.pathname !== '/admin/login' &&
    !authCookie
  ) {
    return NextResponse.redirect(new URL('/auth/login', nextUrl.href));
  }

  // Already logged in and visiting an /auth/* page → send to admin area.
  if (nextUrl.pathname.startsWith('/auth') && authCookie) {
    return NextResponse.redirect(new URL('/admin', nextUrl.href));
  }

  // 1-hour idle expiry for admin sessions. Every authenticated request to
  // `/admin/*` re-stamps the auth cookie with a fresh 3600s maxAge. After an
  // hour of inactivity the cookie expires and the visitor is bounced back to
  // `/admin/login`.
  if (nextUrl.pathname.startsWith('/admin') && authCookie) {
    const cookieValue =
      typeof authCookie === 'string' ? authCookie : authCookie.value;
    topResponse.cookies.set('auth', cookieValue, {
      path: '/',
      maxAge: 3600,
      ...(!process.env.NOT_SECURED
        ? { secure: true, httpOnly: true, sameSite: false }
        : {}),
      ...(process.env.FRONTEND_URL
        ? { domain: getCookieUrlFromDomain(process.env.FRONTEND_URL) }
        : {}),
    });
  }

  // Everything else is public — homepage, dashboard, creators, leaderboard,
  // legal pages, and the /auth/* surface itself when not logged in.
  return topResponse;
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: '/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)',
};
