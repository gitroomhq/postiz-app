import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const ADMIN_PREFIXES = ['/admin'];
const CREATOR_PREFIXES = ['/me', '/onboarding'];
const AUTH_PAGES = new Set(['/login', '/signup']);

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set({ name, value, ...options });
        });
      },
    },
  });

  // Refreshes the session and writes new cookies on response.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
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

  // Logged in. Pull role + onboarding state for routing decisions.
  const [{ data: roleRow }, { data: linkRow }] = await Promise.all([
    supabase.from('user_role').select('role').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('creator_link')
      .select('onboarding_completed')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);
  const role = (roleRow?.role as 'admin' | 'creator' | undefined) ?? 'creator';
  const onboarded = Boolean(linkRow?.onboarding_completed);

  // Logged-in users shouldn't sit on login/signup.
  if (isAuthPage) {
    const target = role === 'admin' ? '/admin' : onboarded ? '/me' : '/onboarding';
    return NextResponse.redirect(new URL(target, request.url));
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
