import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { fetchBackend } from '@gitroom/helpers/utils/custom.fetch.func';
import { getCookieUrlFromDomain } from '@gitroom/helpers/subdomain/subdomain.management';

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  const nextUrl = request.nextUrl;
  const authCookie = request.cookies.get('auth');

  // If the URL is logout, delete the cookie and redirect to login
  if (nextUrl.href.indexOf('/auth/logout') > -1) {
    const response = NextResponse.redirect(
      new URL('/auth/login', nextUrl.href)
    );
    response.cookies.set('auth', '', {
      path: '/',
      sameSite: false,
      httpOnly: true,
      secure: true,
      maxAge: -1,
      domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
    });
    return response;
  }

  const org = nextUrl.searchParams.get('org');
  const url = new URL(nextUrl).search;

  if (nextUrl.href.indexOf('/auth') === -1 && !authCookie) {
    const providers = ['google', 'settings'];
    const findIndex = providers.find((p) => nextUrl.href.indexOf(p) > -1);
    const additional = !findIndex
      ? ''
      : (url.indexOf('?') > -1 ? '&' : '?') +
        `provider=${(findIndex === 'settings'
          ? 'github'
          : findIndex
        ).toUpperCase()}`;
    return NextResponse.redirect(
      new URL(`/auth${url}${additional}`, nextUrl.href)
    );
  }

  // If the url is /auth and the cookie exists, redirect to /
  if (nextUrl.href.indexOf('/auth') > -1 && authCookie) {
    return NextResponse.redirect(new URL(`/${url}`, nextUrl.href));
  }

  if (nextUrl.href.indexOf('/auth') > -1 && !authCookie) {
    if (org) {
      const redirect = NextResponse.redirect(new URL(`/`, nextUrl.href));
      redirect.cookies.set('org', org, {
        path: '/',
        sameSite: false,
        httpOnly: true,
        secure: true,
        expires: new Date(Date.now() + 15 * 60 * 1000),
        domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
      });
      return redirect;
    }
    return NextResponse.next();
  }

  try {
    if (org) {
      const { id } = await (
        await fetchBackend('/user/join-org', {
          body: JSON.stringify({
            org,
          }),
          headers: {
            auth: authCookie?.value!,
          },
          method: 'POST',
        })
      ).json();

      const redirect = NextResponse.redirect(
        new URL(`/?added=true`, nextUrl.href)
      );
      if (id) {
        redirect.cookies.set('showorg', id, {
          path: '/',
          sameSite: false,
          httpOnly: true,
          secure: true,
          expires: new Date(Date.now() + 15 * 60 * 1000),
          domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
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

    const next = NextResponse.next();

    if (
      nextUrl.pathname === '/marketplace/seller' ||
      nextUrl.pathname === '/marketplace/buyer'
    ) {
      const type = nextUrl.pathname.split('/marketplace/')[1].split('/')[0];

      next.cookies.set('marketplace', type === 'seller' ? 'seller' : 'buyer', {
        path: '/',
        sameSite: false,
        httpOnly: true,
        secure: true,
        expires: new Date(Date.now() + 15 * 60 * 1000),
        domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
      });
    }

    return next;
  } catch (err) {
    return NextResponse.redirect(new URL('/auth/logout', nextUrl.href));
  }
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: '/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)',
};
