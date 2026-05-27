/**
 * End-to-end DB smoke: create client + creator, then addProfile().
 * Run: pnpm exec tsx libraries/database/src/seed.smoke.ts
 *
 * Idempotent-ish: uses display_name 'SMOKE_TEST' and cleans up after.
 */

import { getSupabaseAdmin } from './supabase-server';
import { addProfile } from './profile';

async function main() {
  const sb = getSupabaseAdmin();

  // 1. Insert smoke client
  const c = await sb
    .from('client')
    .insert({ name: 'SMOKE_TEST' })
    .select()
    .single();
  if (c.error) throw c.error;
  console.log('[seed] client:', c.data.id);

  // 2. Insert smoke creator
  const cr = await sb
    .from('creator')
    .insert({ client_id: c.data.id, display_name: 'Smoke Creator' })
    .select()
    .single();
  if (cr.error) throw cr.error;
  console.log('[seed] creator:', cr.data.id);

  // 3. addProfile() — happy path
  const p1 = await addProfile({
    creator_id: cr.data.id,
    platform: 'instagram',
    profile_url: 'https://www.instagram.com/cristiano/',
  });
  console.log('[seed] addProfile p1:', p1);
  if (p1.ok !== true) throw new Error('addProfile failed: ' + p1.error);

  // 4. addProfile() — second IG without nickname should fail per spec §3 step 2
  const p2 = await addProfile({
    creator_id: cr.data.id,
    platform: 'instagram',
    profile_url: 'https://www.instagram.com/leomessi/',
  });
  console.log('[seed] addProfile p2 (no nickname, expect fail):', p2);
  if (p2.ok) throw new Error('Expected nickname-required error');

  // 5. addProfile() — second IG WITH nickname should succeed
  const p3 = await addProfile({
    creator_id: cr.data.id,
    platform: 'instagram',
    profile_url: 'https://www.instagram.com/leomessi/',
    nickname: 'Personal',
  });
  console.log('[seed] addProfile p3 (with nickname):', p3);
  if (p3.ok !== true) throw new Error('addProfile p3 failed: ' + p3.error);

  // 6. Cleanup: cascade delete via client
  const del = await sb.from('client').delete().eq('id', c.data.id);
  if (del.error) throw del.error;
  console.log('[seed] cleanup OK');
  console.log('[seed] PASS');
}

main().catch((err) => {
  console.error('[seed] FAIL', err);
  process.exit(1);
});
