import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { fetchBackend } from '@gitroom/helpers/utils/custom.fetch.func';
import {removeSubdomain} from "@gitroom/helpers/subdomain/subdomain.management";

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  const nextUrl = request.nextUrl;
  const authCookie = request.cookies.get('auth');
  const showorg = request.cookies.get('showorg');

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
      domain: '.' + new URL(removeSubdomain(process.env.FRONTEND_URL!)).hostname,
    });
    return response;
  }

  const org = nextUrl.searchParams.get('org');
  const orgUrl = org ? '?org=' + org : '';

  if (nextUrl.href.indexOf('/auth') === -1 && !authCookie) {
    return NextResponse.redirect(new URL(`/auth${orgUrl}`, nextUrl.href));
  }

  // If the url is /auth and the cookie exists, redirect to /
  if (nextUrl.href.indexOf('/auth') > -1 && authCookie) {
    return NextResponse.redirect(new URL(`/${orgUrl}`, nextUrl.href));
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
        domain: '.' + new URL(removeSubdomain(process.env.FRONTEND_URL!)).hostname,
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
          domain: '.' + new URL(removeSubdomain(process.env.FRONTEND_URL!)).hostname,
        });
      }

      return redirect;
    }

    return NextResponse.next();

  } catch (err) {
    return NextResponse.redirect(new URL('/auth/logout', nextUrl.href));
  }
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: '/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)',
};
