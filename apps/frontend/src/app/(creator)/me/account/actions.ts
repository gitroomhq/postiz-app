'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ensureCreatorForUser, getSupabaseAdmin } from '@d3/database';
import { getSupabaseRoute } from '@gitroom/frontend/lib/supabase-route';

// Dashboard/leaderboard URLs are rendered as live <a href> on /me, so restrict
// to https (z.string().url() alone accepts data:/file:/ftp:). They are optional
// now — a creator can use the product without them.
const httpsUrl = z
  .string()
  .url()
  .refine((u) => /^https:\/\//i.test(u), { message: 'Must start with https://' });

// Treat an empty/whitespace field as "not provided" so blanking a URL clears it.
const optionalHttpsUrl = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  httpsUrl.optional(),
);

const accountSchema = z.object({
  displayName: z.string().trim().min(1, 'Display name is required').max(120),
  dashboardUrl: optionalHttpsUrl,
  leaderboardUrl: optionalHttpsUrl,
});

export type UpdateAccountResult = { ok: true } | { ok: false; error: string };

export async function updateAccount(formData: FormData): Promise<UpdateAccountResult> {
  const parsed = accountSchema.safeParse({
    displayName: formData.get('displayName'),
    dashboardUrl: formData.get('dashboardUrl'),
    leaderboardUrl: formData.get('leaderboardUrl'),
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

  // Persist the optional surface URLs. Blank fields clear the stored value.
  const admin = getSupabaseAdmin();
  const { error } = await admin.from('creator_link').upsert(
    {
      user_id: user.id,
      creator_id: ensured.value.creator_id,
      dashboard_url: parsed.data.dashboardUrl ?? null,
      leaderboard_url: parsed.data.leaderboardUrl ?? null,
      onboarding_completed: true,
    },
    { onConflict: 'user_id' },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath('/me/account');
  revalidatePath('/me');
  return { ok: true };
}
