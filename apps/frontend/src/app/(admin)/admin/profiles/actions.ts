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
 */

import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@d3/database';
import { getAuthContext } from '@gitroom/frontend/lib/auth';

async function requireAdmin(): Promise<void> {
  const auth = await getAuthContext();
  if (!auth || auth.role !== 'admin') {
    throw new Error('forbidden');
  }
}

export async function approveClaim(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = String(formData.get('user_id') ?? '');
  const profileId = String(formData.get('profile_id') ?? '');
  if (!userId || !profileId) throw new Error('user_id and profile_id required');

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from('profile_claim')
    .update({ claim_kind: 'owner', confirmed_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('profile_id', profileId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/profiles');
}

export async function rejectClaim(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = String(formData.get('user_id') ?? '');
  const profileId = String(formData.get('profile_id') ?? '');
  if (!userId || !profileId) throw new Error('user_id and profile_id required');

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from('profile_claim')
    .delete()
    .eq('user_id', userId)
    .eq('profile_id', profileId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/profiles');
}

export async function deleteProfile(formData: FormData): Promise<void> {
  await requireAdmin();
  const profileId = String(formData.get('profile_id') ?? '');
  if (!profileId) throw new Error('profile_id required');

  // ON DELETE CASCADE on profile_claim.profile_id + profile_snapshot.profile_id
  // + post_snapshot.profile_id (per init_v1_core_tables + profile_claim
  // migrations) cleans up dependent rows automatically.
  const admin = getSupabaseAdmin();
  const { error } = await admin.from('profile').delete().eq('id', profileId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/profiles');
}
