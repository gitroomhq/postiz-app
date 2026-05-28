/**
 * Cookie-aware Supabase client for Server Components, Route Handlers, and
 * Server Actions (Next.js App Router).
 *
 * Uses @supabase/ssr so the session is read from request cookies and refreshed
 * via Set-Cookie response headers. Different from supabase-server.ts which is
 * a stateless read-only anon client used only for public showcase queries.
 */

import { cookies } from 'next/headers';
import { createServerClient, type CookieMethodsServer } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function getSupabaseRoute(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set.',
    );
  }

  const cookieStore = await cookies();

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      try {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options),
        );
      } catch {
        // Server Components cannot set cookies; that's OK — middleware refreshes.
      }
    },
  };

  return createServerClient(url, key, { cookies: cookieMethods });
}
