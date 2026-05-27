/**
 * Profile CRUD — admin-only writes (uses service_role client, bypasses RLS).
 *
 * Task 3: addProfile().
 *  - Validates URL matches the platform (rejects cross-platform paste)
 *  - Inserts a profile row with scrape_status='pending'
 *  - Returns a Result so callers don't have to try/catch for expected errors
 *
 * Auth: this function assumes the caller is admin. The HTTP route that
 * wraps it (Task 7+) is responsible for the auth check. Don't add an auth
 * check here — it would conflict with cron jobs and seed scripts.
 */

import { getSupabaseAdmin } from './supabase-server';
import { validateProfileUrl } from './profile-url';
import type { Platform, ProfileRow, Result } from './types';

export interface AddProfileInput {
  creator_id: string;
  platform: Platform;
  profile_url: string;
  nickname?: string | null;
}

export async function addProfile(
  input: AddProfileInput,
): Promise<Result<ProfileRow>> {
  const { creator_id, platform, profile_url, nickname } = input;

  if (!creator_id) {
    return { ok: false, error: 'creator_id is required' };
  }

  const validation = validateProfileUrl(platform, profile_url);
  if (validation.ok !== true) {
    return { ok: false, error: validation.error };
  }

  // Spec §3 Step 2: nickname becomes required when ≥2 profiles exist on the
  // same platform for one creator. Enforce here so the HTTP layer doesn't
  // duplicate the check.
  const supabase = getSupabaseAdmin();

  const existing = await supabase
    .from('profile')
    .select('id, nickname')
    .eq('creator_id', creator_id)
    .eq('platform', platform);

  if (existing.error) {
    return { ok: false, error: `Failed to check existing profiles: ${existing.error.message}` };
  }
  if (existing.data && existing.data.length > 0 && !nickname) {
    return {
      ok: false,
      error: `This creator already has a ${platform} profile. Nickname is required to distinguish them.`,
    };
  }

  const insert = await supabase
    .from('profile')
    .insert({
      creator_id,
      platform,
      profile_url: validation.normalizedUrl,
      handle: validation.handle,
      nickname: nickname ?? null,
      scrape_status: 'pending',
    })
    .select()
    .single();

  if (insert.error) {
    return { ok: false, error: `Insert failed: ${insert.error.message}` };
  }
  if (!insert.data) {
    return { ok: false, error: 'Insert returned no row' };
  }

  return { ok: true, value: insert.data as ProfileRow };
}
