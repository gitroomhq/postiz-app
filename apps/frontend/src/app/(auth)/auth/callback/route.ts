import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseRoute } from '@gitroom/frontend/lib/supabase-route';
import { safeRedirect } from '@gitroom/frontend/lib/redirects';

// Email-confirmation (and future OAuth) callback. Supabase redirects here with
// ?code=… — we exchange the code for a session, then route to redirectTo (or /me).
//
// Security: `redirectTo` is sanitized via safeRedirect() — anything that
// isn't a same-origin absolute path falls back to /me, blocking an attacker
// from crafting /auth/callback?code=…&redirectTo=https://evil.com as a
// post-auth phishing vector. `new URL(absoluteUrl, base)` silently honours
// the absolute input, so without this guard the redirect is open.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirectTo = safeRedirect(searchParams.get('redirectTo'), '/me');

  if (!code) {
    // Missing code means the callback was hit without a real auth handshake
    // (manual navigation, broken link, expired magic link). Send the user to
    // /login with an explicit error so they know to retry, instead of
    // silently dropping them onto /me with no session.
    const missingUrl = new URL('/login', origin);
    missingUrl.searchParams.set('error', 'missing_code');
    return NextResponse.redirect(missingUrl);
  }

  const supabase = await getSupabaseRoute();
  const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeErr) {
    const failUrl = new URL('/login', origin);
    failUrl.searchParams.set('error', exchangeErr.message);
    return NextResponse.redirect(failUrl);
  }

  return NextResponse.redirect(new URL(redirectTo, origin));
}
