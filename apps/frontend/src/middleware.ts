import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {fetchBackend} from "@gitroom/helpers/utils/custom.fetch.func";

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
    const nextUrl = request.nextUrl;
    const authCookie = request.cookies.get('auth');
    // If the URL is logout, delete the cookie and redirect to login
    if (nextUrl.href.indexOf('/auth/logout') > -1) {
        const response = NextResponse.redirect(new URL('/auth/login', nextUrl.href));
        response.cookies.set('auth', '', {
            path: '/',
            sameSite: false,
            httpOnly: true,
            secure: true,
            maxAge: -1,
            domain: '.' + new URL(process.env.FRONTEND_URL!).hostname
        });
        return response;
    }

    if (nextUrl.href.indexOf('/auth') === -1 && !authCookie) {
        return NextResponse.redirect(new URL('/auth', nextUrl.href));
    }

    // If the url is /auth and the cookie exists, redirect to /
    if (nextUrl.href.indexOf('/auth') > -1 && authCookie) {
        return NextResponse.redirect(new URL('/', nextUrl.href));
    }

    if (nextUrl.href.indexOf('/auth') > -1) {
        return NextResponse.next();
    }

    try {
        const user = await (await fetchBackend('/user/self', {
            headers: {
                auth: authCookie?.value!
            }
        })).json();

        const next = NextResponse.next();
        next.headers.set('user', JSON.stringify(user));

        return next;
    }
    catch (err) {
        return NextResponse.redirect(new URL('/auth/logout', nextUrl.href));
    }
}

// See "Matching Paths" below to learn more
export const config = {
    matcher: "/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)",
}

