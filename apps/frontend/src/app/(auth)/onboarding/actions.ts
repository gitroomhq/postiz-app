'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getSupabaseAdmin } from '@d3/database';
import { getSupabaseRoute } from '@gitroom/frontend/lib/supabase-route';

// URLs are rendered as live <a href> on /me. Restrict to https so the
// stored value can't become an XSS vector via data:/file:/etc, and so
// the dashboard/leaderboard hyperlinks are guaranteed safe to open in
// a new tab. (z.string().url() alone accepts file://, data:, ftp://.)
const httpsUrl = z
  .string()
  .url()
  .refine((u) => /^https:\/\//i.test(u), {
    message: 'Must start with https://',
  });

const onboardingSchema = z.object({
  displayName: z.string().min(1).max(120),
  dashboardUrl: httpsUrl,
  leaderboardUrl: httpsUrl,
});

export type OnboardingResult = { ok: true } | { ok: false; error: string };

export async function saveOnboarding(formData: FormData): Promise<OnboardingResult> {
  const parsed = onboardingSchema.safeParse({
    displayName: formData.get('displayName'),
    dashboardUrl: formData.get('dashboardUrl'),
    leaderboardUrl: formData.get('leaderboardUrl'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  // Identify the calling user via the cookie-aware client (RLS-respecting).
  const supabase = await getSupabaseRoute();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  // Creator table writes are admin-only under RLS, so use the service-role
  // client for the privileged insert + creator_link update.
  const admin = getSupabaseAdmin();

  // Idempotency: if the user already has a creator linked, update that
  // creator's display_name instead of inserting a new one. Without this,
  // a double-submit (or a re-run after manual creator_link tweaks) would
  // orphan the original creator row, leaving its profile/snapshot/post
  // rows pointing at a creator the user can no longer see.
  const { data: existingLink, error: linkLookupErr } = await admin
    .from('creator_link')
    .select('creator_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (linkLookupErr) return { ok: false, error: linkLookupErr.message };

  let creatorId = existingLink?.creator_id ?? null;
  if (creatorId) {
    const { error: updErr } = await admin
      .from('creator')
      .update({ display_name: parsed.data.displayName })
      .eq('id', creatorId);
    if (updErr) return { ok: false, error: updErr.message };
  } else {
    const { data: creator, error: creatorErr } = await admin
      .from('creator')
      .insert({ display_name: parsed.data.displayName })
      .select('id')
      .single();
    if (creatorErr || !creator) {
      return { ok: false, error: creatorErr?.message ?? 'Could not create creator' };
    }
    creatorId = creator.id;
  }

  // Upsert so the call works whether or not handle_new_auth_user has already
  // created the creator_link row. A plain .update() silently no-ops if the
  // row is missing, leaving the user stuck on /onboarding with no error.
  const { error: linkErr } = await admin.from('creator_link').upsert(
    {
      user_id: user.id,
      creator_id: creatorId,
      dashboard_url: parsed.data.dashboardUrl,
      leaderboard_url: parsed.data.leaderboardUrl,
      onboarding_completed: true,
    },
    { onConflict: 'user_id' }
  );
  if (linkErr) return { ok: false, error: linkErr.message };

  redirect('/me');
}
