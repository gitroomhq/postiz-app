'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseRoute } from '@gitroom/frontend/lib/supabase-route';

/**
 * Remove the caller's claim on a profile (stop tracking / un-own it). Deletes
 * only the profile_claim row, not the canonical profile — other users tracking
 * the same URL are unaffected, and the row stays available to re-add later.
 *
 * Uses the cookie-aware client: the "user deletes own claims" RLS policy
 * guarantees a creator can only ever delete their own claim, so no extra
 * ownership check is needed here.
 */
export interface RemoveClaimResult {
  ok: boolean;
  error?: string;
}

// useActionState signature: (prevState, formData). prevState unused.
export async function removeClaim(
  _prev: RemoveClaimResult | null,
  formData: FormData,
): Promise<RemoveClaimResult> {
  try {
    const profileId = String(formData.get('profile_id') ?? '');
    if (!profileId) return { ok: false, error: 'Missing profile.' };

    const sb = await getSupabaseRoute();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return { ok: false, error: 'Not signed in.' };

    const { error } = await sb
      .from('profile_claim')
      .delete()
      .eq('user_id', user.id)
      .eq('profile_id', profileId);
    if (error) return { ok: false, error: error.message };

    revalidatePath('/me/profiles');
    revalidatePath('/me');
    return { ok: true };
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unexpected error' };
  }
}
