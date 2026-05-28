import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const ADMIN_PREFIXES = ['/admin'];
const CREATOR_PREFIXES = ['/me', '/onboarding'];
const AUTH_PAGES = new Set(['/login', '/signup']);

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Canonical Supabase SSR pattern: write to both request and response
        // cookies so Server Components in the same request see the refreshed
        // session, and the browser receives the new cookies on the way out.
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Refreshes the session and writes new cookies on response.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // API routes authenticate themselves (handlers call getUser) and must never
  // be redirected — a 3xx would corrupt fetch/JSON callers. Bail after the
  // session refresh above.
  if (pathname.startsWith('/api')) return response;

  const isAuthPage = AUTH_PAGES.has(pathname);
  const isAdminRoute = ADMIN_PREFIXES.some((p) => pathname.startsWith(p));
  const isCreatorRoute = CREATOR_PREFIXES.some((p) => pathname.startsWith(p));

  if (!user) {
    if (isAdminRoute || isCreatorRoute) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  // A logged-in user always needs their role resolved now: admins are confined
  // to /admin/* and bounced off every public + auth route, so the old "public
  // routes skip the lookup" shortcut no longer holds for authenticated
  // requests. Anonymous traffic — the bulk of public-page load — already
  // returned above, so this DB roundtrip is paid only by signed-in users.
  const { data: roleRow, error: roleErr } = await supabase
    .from('user_role')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  // Onboarding state only matters for creator-route / auth-page routing — skip
  // the extra query on public routes.
  let onboarded = false;
  let linkErr: { message: string } | null = null;
  if (isAuthPage || isCreatorRoute) {
    const linkRes = await supabase
      .from('creator_link')
      .select('onboarding_completed')
      .eq('user_id', user.id)
      .maybeSingle();
    onboarded = Boolean(linkRes.data?.onboarding_completed);
    linkErr = linkRes.error;
  }

  // Distinguish "no row" (legitimate — fresh user) from "DB/network error".
  // On a real error we fail closed: kick to /login with a generic flag rather
  // than silently treating the user as a default-role creator.
  if (roleErr || linkErr) {
    console.error('[proxy] role/onboarding lookup failed', {
      roleErr: roleErr?.message,
      linkErr: linkErr?.message,
      userId: user.id,
    });
    const failUrl = new URL('/login', request.url);
    failUrl.searchParams.set('error', 'session_lookup_failed');
    return NextResponse.redirect(failUrl);
  }
  const role = (roleRow?.role as 'admin' | 'creator' | undefined) ?? 'creator';

  // Logged-in users shouldn't sit on login/signup.
  if (isAuthPage) {
    const target = role === 'admin' ? '/admin' : onboarded ? '/me' : '/onboarding';
    return NextResponse.redirect(new URL(target, request.url));
  }

  // Confine admins to the admin surface: bounce them off every public route
  // (home, showcase dashboard/leaderboard, creator browse pages) to their own
  // dashboard. "Public" here = not an admin route and not a creator route
  // (auth pages + /api were handled above).
  if (role === 'admin' && !isAdminRoute && !isCreatorRoute) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // Admin-only routes.
  if (isAdminRoute && role !== 'admin') {
    return NextResponse.redirect(new URL('/me', request.url));
  }

  // Creator routes: admins are allowed in too (read-only convenience),
  // but creators who haven't onboarded must finish that first.
  if (isCreatorRoute && role === 'creator' && !onboarded && pathname !== '/onboarding') {
    return NextResponse.redirect(new URL('/onboarding', request.url));
  }

  // Block /onboarding for users who've already finished it.
  if (pathname === '/onboarding' && onboarded) {
    return NextResponse.redirect(new URL('/me', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Run on all paths except Next internals + static assets.
    '/((?!_next/static|_next/image|favicon.ico|api/cron|api/proxy-image|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map)$).*)',
  ],
};
