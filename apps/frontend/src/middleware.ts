import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCookieUrlFromDomain } from '@gitroom/helpers/subdomain/subdomain.management';
import { internalFetch } from '@gitroom/helpers/utils/internal.fetch';
import acceptLanguage from 'accept-language';
import {
  cookieName,
  fallbackLng,
  headerName,
  languages,
} from '@gitroom/react/translation/i18n.config';
acceptLanguage.languages(languages);

// Cookie security options based on deployment context.
// Desktop (DESKTOP_COOKIE_MODE): WKWebView rejects Secure cookies on http://localhost.
// Production (default): full Secure+HttpOnly+SameSite for HTTPS.
// NOT_SECURED: legacy dev/HTTP mode — no flags, for backward compatibility.
function middlewareCookieFlags(): object {
  if (process.env.DESKTOP_COOKIE_MODE) {
    return { secure: false, httpOnly: true, sameSite: 'lax' };
  }
  if (process.env.NOT_SECURED) {
    return {};
  }
  return { secure: true, httpOnly: true, sameSite: false };
}

// Includes path and domain — for cookies where those were inside the conditional block.
function middlewareCookieWithPathDomain(): object {
  if (process.env.DESKTOP_COOKIE_MODE) {
    return {
      path: '/',
      secure: false,
      httpOnly: true,
      sameSite: 'lax',
      domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
    };
  }
  if (process.env.NOT_SECURED) {
    return {};
  }
  return {
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: false,
    domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
  };
}

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  const nextUrl = request.nextUrl;

  // Desktop/non-secured mode: when navigating to a page with ?loggedAuth=JWT in the URL,
  // the middleware sets a proper HttpOnly auth cookie and redirects to the clean URL.
  // This handles WKWebView's async cookie-store sync: JS cookies set via document.cookie
  // may not appear in native HTTP requests immediately. By including loggedAuth in the
  // URL we guarantee the middleware can authenticate and set a persistent server cookie.
  // Only enabled for DESKTOP_COOKIE_MODE or NOT_SECURED environments — never production.
  const loggedAuthInUrl = nextUrl.searchParams.get('loggedAuth');
  if (
    loggedAuthInUrl &&
    (process.env.DESKTOP_COOKIE_MODE || process.env.NOT_SECURED)
  ) {
    const destUrl = new URL(nextUrl.href);
    destUrl.searchParams.delete('loggedAuth');
    const resp = NextResponse.redirect(destUrl);
    resp.cookies.set('auth', loggedAuthInUrl, {
      path: '/',
      ...middlewareCookieFlags(),
      maxAge: 365 * 24 * 60 * 60,
      domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
    });
    return resp;
  }

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

  const topResponse = NextResponse.next();

  if (lng) {
    topResponse.headers.set(cookieName, lng);
  }

  if (nextUrl.pathname.startsWith('/modal/') && !authCookie) {
    return NextResponse.redirect(new URL(`/auth/login-required`, nextUrl.href));
  }

  if (
    nextUrl.pathname.startsWith('/uploads/') ||
    nextUrl.pathname.startsWith('/p/') ||
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

  // If the URL is logout, delete the cookie and redirect to login
  if (nextUrl.href.indexOf('/auth/logout') > -1) {
    const response = NextResponse.redirect(
      new URL('/auth/login', nextUrl.href)
    );
    response.cookies.set('auth', '', {
      path: '/',
      ...middlewareCookieFlags(),
      maxAge: -1,
      domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
    });
    return response;
  }

  const org = nextUrl.searchParams.get('org');
  const url = new URL(nextUrl).search;
  if (!nextUrl.pathname.startsWith('/auth') && !authCookie) {
    const providers = ['google', 'settings'];
    const findIndex = providers.find((p) => nextUrl.href.indexOf(p) > -1);
    const additional = !findIndex
      ? ''
      : (url.indexOf('?') > -1 ? '&' : '?') +
        `provider=${(findIndex === 'settings'
          ? process.env.POSTIZ_GENERIC_OAUTH
            ? 'generic'
            : 'github'
          : findIndex
        ).toUpperCase()}`;
    return NextResponse.redirect(
      new URL(`/auth${url}${additional}`, nextUrl.href)
    );
  }

  // If the url is /auth and the cookie exists, redirect to /
  if (nextUrl.pathname.startsWith('/auth') && authCookie) {
    return NextResponse.redirect(new URL(`/${url}`, nextUrl.href));
  }
  if (nextUrl.pathname.startsWith('/auth') && !authCookie) {
    if (org) {
      const redirect = NextResponse.redirect(new URL(`/`, nextUrl.href));
      redirect.cookies.set('org', org, {
        ...middlewareCookieWithPathDomain(),
        expires: new Date(Date.now() + 15 * 60 * 1000),
      });
      return redirect;
    }
    return topResponse;
  }
  try {
    if (org) {
      const { id } = await (
        await internalFetch('/user/join-org', {
          body: JSON.stringify({
            org,
          }),
          method: 'POST',
        })
      ).json();
      const redirect = NextResponse.redirect(
        new URL(`/?added=true`, nextUrl.href)
      );
      if (id) {
        redirect.cookies.set('showorg', id, {
          ...middlewareCookieWithPathDomain(),
          expires: new Date(Date.now() + 15 * 60 * 1000),
        });
      }
      return redirect;
    }
    if (nextUrl.pathname === '/') {
      return NextResponse.redirect(
        new URL(
          !!process.env.IS_GENERAL ? '/launches' : `/analytics`,
          nextUrl.href
        )
      );
    }

    return topResponse;
  } catch (err) {
    console.log('err', err);
    return NextResponse.redirect(new URL('/auth/logout', nextUrl.href));
  }
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: '/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)',
};
