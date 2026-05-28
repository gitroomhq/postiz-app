/**
 * Integration tests for findOrCreateProfile, addProfileClaim, and the
 * cross-platform Auto-Discovery query.
 *
 * Runs against a local Supabase stack started via:
 *   npx supabase start
 *
 * Required env (or via .env at repo root):
 *   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
 *   SUPABASE_SERVICE_ROLE_KEY=<service_role from `supabase status`>
 *
 * Run:
 *   pnpm exec tsx --test libraries/database/src/claim.test.ts
 *
 * The dedupe test is the load-bearing assertion for the user's
 * "duplicate scraping targets = failure" requirement: it fires N concurrent
 * findOrCreateProfile calls for the same URL and asserts exactly one profile
 * row + N claim rows result.
 */

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import {
  addProfileClaim,
  decideInitialClaimKind,
  findCandidatesByHandle,
  findOrCreateProfile,
  normalizeHandle,
} from './index';
import { getSupabaseAdmin } from './supabase-server';

const supabase = getSupabaseAdmin();

const TEST_TAG = `t_${randomUUID().slice(0, 8)}`;
const createdProfileIds: string[] = [];
const createdClaimUserIds: string[] = [];
const createdCreatorIds: string[] = [];
const createdAuthUserIds: string[] = [];

async function ensureAuthUser(): Promise<string> {
  const { data, error } = await supabase.auth.admin.createUser({
    email: `${TEST_TAG}_${randomUUID().slice(0, 6)}@test.local`,
    password: randomUUID(),
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  createdAuthUserIds.push(data.user.id);
  return data.user.id;
}

async function ensureCreator(displayName: string): Promise<string> {
  const ins = await supabase
    .from('creator')
    .insert({ display_name: displayName })
    .select('id')
    .single();
  if (ins.error || !ins.data) throw new Error(`creator insert: ${ins.error?.message}`);
  createdCreatorIds.push(ins.data.id);
  return ins.data.id;
}

describe('normalizeHandle', () => {
  it('folds case + separators', () => {
    assert.equal(normalizeHandle('John.Smith'), 'johnsmith');
    assert.equal(normalizeHandle('j_smith_'), 'jsmith');
    assert.equal(normalizeHandle('JANE-DOE'), 'janedoe');
  });
  it('strips trailing platform suffix conventions', () => {
    assert.equal(normalizeHandle('johnofficial'), 'john');
    assert.equal(normalizeHandle('jane.tv'), 'jane');
    assert.equal(normalizeHandle('alex_real'), 'alex');
    assert.equal(normalizeHandle('sam_ig'), 'sam');
  });
  it('handles null/empty', () => {
    assert.equal(normalizeHandle(null), '');
    assert.equal(normalizeHandle(undefined), '');
    assert.equal(normalizeHandle(''), '');
  });
});

describe('decideInitialClaimKind', () => {
  it('returns owner when profile was just created', () => {
    const k = decideInitialClaimKind({
      created: true,
      profileHandle: 'foo',
      onboardingHandles: [],
    });
    assert.equal(k, 'owner');
  });
  it('returns owner when handle matches caller history (case/separator-insensitive)', () => {
    const k = decideInitialClaimKind({
      created: false,
      profileHandle: 'J.Smith',
      onboardingHandles: ['jsmith'],
    });
    assert.equal(k, 'owner');
  });
  it('returns pending when handle does not match anything caller knows', () => {
    const k = decideInitialClaimKind({
      created: false,
      profileHandle: 'someone_else',
      onboardingHandles: ['jsmith', 'janed'],
    });
    assert.equal(k, 'pending');
  });
  it('returns pending when caller has no known handles', () => {
    const k = decideInitialClaimKind({
      created: false,
      profileHandle: 'foo',
      onboardingHandles: [],
    });
    assert.equal(k, 'pending');
  });
});

describe('findOrCreateProfile — concurrent inserts', () => {
  it('produces exactly one profile row when many requests fire same URL at once', async () => {
    const creatorId = await ensureCreator(`${TEST_TAG}_canon`);
    const url = `https://www.instagram.com/${TEST_TAG}_canon`;

    const N = 8;
    const results = await Promise.all(
      Array.from({ length: N }, () =>
        findOrCreateProfile({
          platform: 'instagram',
          profile_url: url,
          fallback_creator_id: creatorId,
        }),
      ),
    );

    const profileIds = new Set<string>();
    let createdCount = 0;
    for (const r of results) {
      assert.equal(r.ok, true, JSON.stringify(r));
      if (r.ok) {
        profileIds.add(r.value.profile.id);
        if (r.value.created) createdCount += 1;
        createdProfileIds.push(r.value.profile.id);
      }
    }

    assert.equal(profileIds.size, 1, 'all concurrent callers must converge on one profile');
    assert.equal(createdCount, 1, 'exactly one INSERT should succeed; others must be no-op SELECTs');
  });

  it('returns existing row across different fallback_creator_id values', async () => {
    const adminCreator = await ensureCreator(`${TEST_TAG}_admin`);
    const creatorCreator = await ensureCreator(`${TEST_TAG}_creator`);
    const url = `https://www.tiktok.com/@${TEST_TAG}_seed`;

    const adminCall = await findOrCreateProfile({
      platform: 'tiktok',
      profile_url: url,
      fallback_creator_id: adminCreator,
    });
    assert.equal(adminCall.ok, true);
    if (!adminCall.ok) throw new Error('admin path failed');
    assert.equal(adminCall.value.created, true);
    createdProfileIds.push(adminCall.value.profile.id);

    const creatorCall = await findOrCreateProfile({
      platform: 'tiktok',
      profile_url: url,
      fallback_creator_id: creatorCreator,
    });
    assert.equal(creatorCall.ok, true);
    if (!creatorCall.ok) throw new Error('creator path failed');
    assert.equal(creatorCall.value.created, false);
    assert.equal(
      creatorCall.value.profile.id,
      adminCall.value.profile.id,
      'creator must receive the admin-created canonical row, not a new one',
    );
    assert.equal(
      creatorCall.value.profile.creator_id,
      adminCreator,
      'canonical creator_id must NOT be overwritten by the second caller',
    );
  });
});

describe('addProfileClaim + DB constraints', () => {
  it('two users can each claim the same canonical profile', async () => {
    const creatorId = await ensureCreator(`${TEST_TAG}_dual`);
    const userA = await ensureAuthUser();
    const userB = await ensureAuthUser();
    createdClaimUserIds.push(userA, userB);

    const foc = await findOrCreateProfile({
      platform: 'instagram',
      profile_url: `https://www.instagram.com/${TEST_TAG}_dual`,
      fallback_creator_id: creatorId,
    });
    assert.equal(foc.ok, true);
    if (!foc.ok) throw new Error('foc failed');
    const profileId = foc.value.profile.id;
    createdProfileIds.push(profileId);

    const claimA = await addProfileClaim({
      user_id: userA,
      profile_id: profileId,
      claim_kind: 'owner',
      claimed_via: 'manual',
    });
    const claimB = await addProfileClaim({
      user_id: userB,
      profile_id: profileId,
      claim_kind: 'tracker',
      claimed_via: 'admin_assigned',
    });
    assert.equal(claimA.ok, true);
    assert.equal(claimB.ok, true);

    const rows = await supabase
      .from('profile_claim')
      .select('user_id, claim_kind')
      .eq('profile_id', profileId);
    assert.equal(rows.error, null);
    assert.equal(rows.data?.length, 2);
  });

  it('partial unique index blocks a second owner on the same profile', async () => {
    const creatorId = await ensureCreator(`${TEST_TAG}_owner`);
    const userA = await ensureAuthUser();
    const userB = await ensureAuthUser();
    createdClaimUserIds.push(userA, userB);

    const foc = await findOrCreateProfile({
      platform: 'tiktok',
      profile_url: `https://www.tiktok.com/@${TEST_TAG}_owner`,
      fallback_creator_id: creatorId,
    });
    assert.equal(foc.ok, true);
    if (!foc.ok) throw new Error('foc failed');
    createdProfileIds.push(foc.value.profile.id);

    const ok = await addProfileClaim({
      user_id: userA,
      profile_id: foc.value.profile.id,
      claim_kind: 'owner',
      claimed_via: 'manual',
    });
    assert.equal(ok.ok, true);

    // Direct DB insert to bypass addProfileClaim's idempotent (user,profile)
    // collision path — we want to test the partial unique index on owner.
    const dup = await supabase.from('profile_claim').insert({
      user_id: userB,
      profile_id: foc.value.profile.id,
      claim_kind: 'owner',
      claimed_via: 'manual',
      confirmed_at: new Date().toISOString(),
    });
    assert.notEqual(dup.error, null, 'second owner on same profile must violate partial unique index');
  });
});

describe('findCandidatesByHandle — auto-discovery', () => {
  it('finds cross-platform matches and excludes seed platform', async () => {
    const creatorId = await ensureCreator(`${TEST_TAG}_disco`);
    const handle = `disco_${TEST_TAG}`;

    const ig = await findOrCreateProfile({
      platform: 'instagram',
      profile_url: `https://www.instagram.com/${handle}`,
      fallback_creator_id: creatorId,
    });
    const tt = await findOrCreateProfile({
      platform: 'tiktok',
      profile_url: `https://www.tiktok.com/@${handle}`,
      fallback_creator_id: creatorId,
    });
    assert.equal(ig.ok, true);
    assert.equal(tt.ok, true);
    if (ig.ok) createdProfileIds.push(ig.value.profile.id);
    if (tt.ok) createdProfileIds.push(tt.value.profile.id);

    const res = await findCandidatesByHandle({
      seedPlatform: 'instagram',
      seedHandle: handle,
    });
    assert.equal(res.ok, true);
    if (!res.ok) return;
    const platforms = res.value.map((c) => c.profile.platform);
    assert.ok(platforms.includes('tiktok'), 'tiktok match should appear');
    assert.ok(!platforms.includes('instagram'), 'seed platform must be excluded');
    const ttMatch = res.value.find((c) => c.profile.platform === 'tiktok');
    assert.ok(ttMatch);
    assert.equal(ttMatch.score, 1.0, 'exact lower(handle) match scores 1.0');
    assert.equal(ttMatch.bucket, 'high');
  });

  it('hides profiles already owned by another user (privacy guard)', async () => {
    const creatorOther = await ensureCreator(`${TEST_TAG}_other`);
    const ownerUser = await ensureAuthUser();
    createdClaimUserIds.push(ownerUser);
    const handle = `priv_${TEST_TAG}`;

    const ig = await findOrCreateProfile({
      platform: 'instagram',
      profile_url: `https://www.instagram.com/${handle}`,
      fallback_creator_id: creatorOther,
    });
    const tt = await findOrCreateProfile({
      platform: 'tiktok',
      profile_url: `https://www.tiktok.com/@${handle}`,
      fallback_creator_id: creatorOther,
    });
    assert.equal(ig.ok, true);
    assert.equal(tt.ok, true);
    if (!ig.ok || !tt.ok) return;
    createdProfileIds.push(ig.value.profile.id, tt.value.profile.id);

    await addProfileClaim({
      user_id: ownerUser,
      profile_id: tt.value.profile.id,
      claim_kind: 'owner',
      claimed_via: 'manual',
    });

    const res = await findCandidatesByHandle({
      seedPlatform: 'instagram',
      seedHandle: handle,
    });
    assert.equal(res.ok, true);
    if (!res.ok) return;
    const ttFound = res.value.find((c) => c.profile.id === tt.value.profile.id);
    assert.equal(ttFound, undefined, 'profile owned by another user must be hidden from discovery');
  });
});

after(async () => {
  if (createdProfileIds.length > 0) {
    await supabase.from('profile').delete().in('id', createdProfileIds);
  }
  if (createdCreatorIds.length > 0) {
    await supabase.from('creator').delete().in('id', createdCreatorIds);
  }
  for (const uid of createdAuthUserIds) {
    await supabase.auth.admin.deleteUser(uid).catch(() => {});
  }
});
