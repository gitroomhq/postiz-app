'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ensureCreatorForUser } from '@d3/database';
import { getSupabaseRoute } from '@gitroom/frontend/lib/supabase-route';

const accountSchema = z.object({
  displayName: z.string().trim().min(1, 'Display name is required').max(120),
});

export type UpdateAccountResult = { ok: true } | { ok: false; error: string };

export async function updateAccount(formData: FormData): Promise<UpdateAccountResult> {
  const parsed = accountSchema.safeParse({
    displayName: formData.get('displayName'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const supabase = await getSupabaseRoute();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  // Provision-or-update the creator identity + display name (service-role under
  // the hood — creator writes are admin-only).
  const ensured = await ensureCreatorForUser({
    user_id: user.id,
    display_name: parsed.data.displayName,
  });
  if (ensured.ok !== true) return { ok: false, error: ensured.error };

  revalidatePath('/me/account');
  revalidatePath('/me');
  return { ok: true };
}
