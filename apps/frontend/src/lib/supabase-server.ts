/**
 * Server-side Supabase client for read-only public queries.
 *
 * Uses the PUBLISHABLE (anon) key — RLS policies are open SELECT for
 * anon+authenticated on all 5 tables (D3 is a public showcase site).
 *
 * NOT to be confused with @d3/database's getSupabaseAdmin() which uses the
 * service_role key for server-side writes (cron, admin actions). That one
 * lives in libraries/database and MUST NOT be imported here.
 *
 * Called from Next.js Server Components and Route Handlers.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export function getSupabaseRead(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set. See .env.example.',
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
