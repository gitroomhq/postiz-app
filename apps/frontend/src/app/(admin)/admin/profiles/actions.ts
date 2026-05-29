'use server';

/**
 * Admin server actions for profile + claim management.
 *
 * All actions:
 *  1. Re-check is_admin() via the cookie-aware client (defense-in-depth even
 *     though the (admin) layout already gates).
 *  2. Mutate via the service-role client (RLS allows admin via "admin manages *",
 *     but service-role is faster and uniform with the rest of our writes).
 *  3. revalidatePath('/admin/profiles') so the list reflects the change.
 *
 * Each action returns an `ActionResult` rather than throwing, so the client
 * buttons (useActionState) can surface a friendly message instead of an
 * unhandled error boundary. The `prevState` arg is unused but required by the
 * useActionState `(prevState, formData)` signature.
 */

import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@d3/database';
import { getAuthContext } from '@gitroom/frontend/lib/auth';

export interface ActionResult {
  ok: boolean;
  message: string;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected error';
}

async function requireAdmin(): Promise<void> {
  const auth = await getAuthContext();
  if (!auth || auth.role !== 'admin') {
    throw new Error('Not authorized.');
  }
}

export async function approveClaim(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const userId = String(formData.get('user_id') ?? '');
    const profileId = String(formData.get('profile_id') ?? '');
    if (!userId || !profileId) return { ok: false, message: 'Missing user or profile.' };

    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from('profile_claim')
      .update({ claim_kind: 'owner', confirmed_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('profile_id', profileId);
    if (error) return { ok: false, message: error.message };

    revalidatePath('/admin/profiles');
    return { ok: true, message: 'Claim approved.' };
  } catch (error: unknown) {
    return { ok: false, message: getErrorMessage(error) };
  }
}

export async function rejectClaim(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const userId = String(formData.get('user_id') ?? '');
    const profileId = String(formData.get('profile_id') ?? '');
    if (!userId || !profileId) return { ok: false, message: 'Missing user or profile.' };

    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from('profile_claim')
      .delete()
      .eq('user_id', userId)
      .eq('profile_id', profileId);
    if (error) return { ok: false, message: error.message };

    revalidatePath('/admin/profiles');
    return { ok: true, message: 'Claim rejected.' };
  } catch (error: unknown) {
    return { ok: false, message: getErrorMessage(error) };
  }
}

export async function deleteProfile(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const profileId = String(formData.get('profile_id') ?? '');
    if (!profileId) return { ok: false, message: 'Missing profile.' };

    // ON DELETE CASCADE on profile_claim.profile_id + profile_snapshot.profile_id
    // + post_snapshot.profile_id (per init_v1_core_tables + profile_claim
    // migrations) cleans up dependent rows automatically.
    const admin = getSupabaseAdmin();
    const { error } = await admin.from('profile').delete().eq('id', profileId);
    if (error) return { ok: false, message: error.message };

    revalidatePath('/admin/profiles');
    return { ok: true, message: 'Profile deleted.' };
  } catch (error: unknown) {
    return { ok: false, message: getErrorMessage(error) };
  }
}
