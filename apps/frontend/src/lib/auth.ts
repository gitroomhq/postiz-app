/**
 * Server-side auth helpers used by Server Components and route guards.
 * Reads the session from the cookie-aware client and joins with user_role
 * and creator_link so callers get a single AuthContext object.
 *
 * Memoised per request via React's `cache()` — many Server Components in a
 * single render tree call this (the public layout, the (creator) layout,
 * the page itself, etc.). Without `cache()` each call would re-issue the
 * getUser + user_role + creator_link round trips. With it, the first call
 * does the work and the rest of the tree gets the same result for free.
 */

import { cache } from 'react';
import { getSupabaseRoute } from './supabase-route';

export type UserRole = 'admin' | 'creator';

export interface CreatorLink {
  user_id: string;
  creator_id: string | null;
  dashboard_url: string | null;
  leaderboard_url: string | null;
  onboarding_completed: boolean;
}

export interface AuthContext {
  userId: string;
  email: string | null;
  role: UserRole;
  creatorLink: CreatorLink | null;
}

export const getAuthContext = cache(
  async (): Promise<AuthContext | null> => {
    const supabase = await getSupabaseRoute();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const [roleRes, linkRes] = await Promise.all([
      supabase.from('user_role').select('role').eq('user_id', user.id).maybeSingle(),
      supabase
        .from('creator_link')
        .select('user_id, creator_id, dashboard_url, leaderboard_url, onboarding_completed')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    const role: UserRole = (roleRes.data?.role as UserRole) ?? 'creator';
    return {
      userId: user.id,
      email: user.email ?? null,
      role,
      creatorLink: (linkRes.data as CreatorLink | null) ?? null,
    };
  },
);
