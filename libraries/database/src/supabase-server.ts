/**
 * Server-side Supabase client (uses service_role key — bypasses RLS).
 *
 * NEVER import this from browser code. Vercel will warn if you try to bundle
 * SUPABASE_SERVICE_ROLE_KEY into the client.
 *
 * Use cases (all server-side):
 *  - Vercel Cron handlers (daily snapshot, retention cleanup)
 *  - Next.js Route Handlers / Server Actions for admin writes
 *  - One-off scripts (seed data, manual scrape trigger)
 *
 * Browser/SSR-public reads should use the publishable key client — created
 * separately in apps/frontend.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) env var is required. See .env.example.',
    );
  }
  if (!serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY env var is required for server writes. See .env.example.',
    );
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
