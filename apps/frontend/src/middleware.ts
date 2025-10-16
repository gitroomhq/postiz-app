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

export async function middleware(request: NextRequest) {
  const nextUrl = request.nextUrl;

  const authCookie =
    request.cookies.get('auth') ||
    request.headers.get('auth') ||
    nextUrl.searchParams.get('loggedAuth');

  // 🟢 Skip auth in frontend-only deployments
  if (process.env.SKIP_AUTH === '1') {
    console.log('🟢 Skipping auth check (frontend-only mode)');
    return NextResponse.next();
  }

  const lng = request.cookies.has(cookieName)
    ? acceptLanguage.get(request.cookies.get(cookieName).value)
    : acceptLanguage.get(
        request.headers.get('Accept-Language') ||
          request.headers.get('accept-language')
      );

  const topResponse = NextResponse.next();
  if (lng) topResponse.headers.set(cookieName, lng);

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

  // Handle logout
  if (nextUrl.href.includes('/auth/logout')) {
    const response = NextResponse.redirect(
      new URL('/auth/login', nextUrl.href)
    );
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

  const org = nextUrl.searchParams.get('org');
  const url = new URL(nextUrl).search;

  if (!nextUrl.href.includes('/auth') && !authCookie) {
    const providers = ['google', 'settings'];
    const findIndex = providers.find((p) => nextUrl.href.includes(p));
    const additional = !findIndex
      ? ''
      : (url.includes('?') ? '&' : '?') +
        `provider=${(
          findIndex === 'settings'
            ? process.env.POSTIZ_GENERIC_OAUTH
              ? 'generic'
              : 'github'
            : findIndex
        ).toUpperCase()}`;
    return NextResponse.redirect(
      new URL(`/auth${url}${additional}`, nextUrl.href)
    );
  }

  if (nextUrl.href.includes('/auth') && authCookie) {
    return NextResponse.redirect(new URL(`/${url}`, nextUrl.href));
  }

  if (nextUrl.href.includes('/auth') && !authCookie) {
    if (org) {
      const redirect = NextResponse.redirect(new URL(`/`, nextUrl.href));
      redirect.cookies.set('org', org, {
        ...(!process.env.NOT_SECURED
          ? {
              path: '/',
              secure: true,
              httpOnly: true,
              sameSite: false,
              domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
            }
          : {}),
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
          body: JSON.stringify({ org }),
          method: 'POST',
        })
      ).json();

      const redirect = NextResponse.redirect(
        new URL(`/?added=true`, nextUrl.href)
      );

      if (id) {
        redirect.cookies.set('showorg', id, {
          ...(!process.env.NOT_SECURED
            ? {
                path: '/',
                secure: true,
                httpOnly: true,
                sameSite: false,
                domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
              }
            : {}),
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

export const config = {
  matcher: '/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)',
};
