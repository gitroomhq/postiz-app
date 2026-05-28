/**
 * Admin "All Creators / Accounts" aggregation.
 *
 * The agency reviews *accounts* (creators), not raw profile URLs. This builds
 * one group per creator — their platform profiles nested underneath with
 * per-profile stats + claim state, plus account-level aggregates (total reach,
 * daily delta, views, engagement). Mirrors the spec's "All Creators View".
 *
 * Service-role client: admin sees every creator/profile across the system
 * (RLS bypassed). Gated upstream by the (admin) layout + page role checks.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const SNAPSHOT_WINDOW_DAYS = 14;

export interface AdminPendingClaim {
  userId: string;
  profileId: string;
  platform: string;
  handle: string | null;
  profileUrl: string;
  creatorName: string;
}

export interface AdminProfileRow {
  id: string;
  platform: string;
  handle: string | null;
  displayName: string | null;
  profileUrl: string;
  scrapeStatus: string;
  followers: number | null;
  followersDelta: number | null;
  views: number | null;
  ownerCount: number;
  trackerCount: number;
  pendingCount: number;
}

export interface AdminCreatorGroup {
  creatorId: string;
  displayName: string;
  avatarUrl: string | null;
  clientName: string | null;
  profileCount: number;
  platforms: string[];
  totalReach: number;
  reachDelta: number;
  totalViews: number;
  engagement: number | null;
  /** worst-case health across the creator's profiles, for an at-a-glance pill */
  status: string;
  profiles: AdminProfileRow[];
}

export interface AdminCreatorsData {
  groups: AdminCreatorGroup[];
  pendingClaims: AdminPendingClaim[];
  totals: {
    creators: number;
    profiles: number;
    reach: number;
    views: number;
  };
}

interface CreatorRow {
  id: string;
  display_name: string;
  avatar_url: string | null;
  client_id: string | null;
}
interface ProfileRow {
  id: string;
  creator_id: string;
  platform: string;
  profile_url: string;
  handle: string | null;
  display_name: string | null;
  scrape_status: string;
}
interface SnapshotRow {
  profile_id: string;
  captured_date: string;
  followers: number | null;
  total_views: number | null;
  total_likes: number | null;
}
interface ClaimRow {
  profile_id: string;
  user_id: string;
  claim_kind: 'owner' | 'tracker' | 'pending';
}

// Rank scrape statuses so a creator's card can surface its worst profile.
const STATUS_RANK: Record<string, number> = {
  failed: 5,
  not_found: 4,
  private: 3,
  throttled: 2,
  handle_changed: 2,
  pending: 1,
  ok: 0,
};

function worstStatus(statuses: string[]): string {
  if (statuses.length === 0) return 'ok';
  return statuses.reduce((worst, s) =>
    (STATUS_RANK[s] ?? 0) > (STATUS_RANK[worst] ?? 0) ? s : worst,
  );
}

export async function getAdminCreatorsData(
  admin: SupabaseClient,
): Promise<AdminCreatorsData> {
  const [creatorsRes, clientsRes, profilesRes, claimsRes] = await Promise.all([
    admin.from('creator').select('id, display_name, avatar_url, client_id'),
    admin.from('client').select('id, name'),
    admin
      .from('profile')
      .select('id, creator_id, platform, profile_url, handle, display_name, scrape_status')
      .order('created_at', { ascending: false })
      .limit(500),
    admin.from('profile_claim').select('profile_id, user_id, claim_kind'),
  ]);

  const creators = (creatorsRes.data ?? []) as CreatorRow[];
  const profiles = (profilesRes.data ?? []) as ProfileRow[];
  const claims = (claimsRes.data ?? []) as ClaimRow[];
  const clientName = new Map<string, string>();
  for (const c of (clientsRes.data ?? []) as { id: string; name: string }[]) {
    clientName.set(c.id, c.name);
  }
  const creatorName = new Map(creators.map((c) => [c.id, c.display_name]));

  // Latest + previous snapshot per profile (for follower delta + current reach).
  const profileIds = profiles.map((p) => p.id);
  let snapshots: SnapshotRow[] = [];
  if (profileIds.length) {
    const sinceIso = new Date(Date.now() - SNAPSHOT_WINDOW_DAYS * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const { data } = await admin
      .from('profile_snapshot')
      .select('profile_id, captured_date, followers, total_views, total_likes')
      .in('profile_id', profileIds)
      .gte('captured_date', sinceIso)
      .order('captured_date', { ascending: false });
    snapshots = (data ?? []) as SnapshotRow[];
  }
  const snapsByProfile = new Map<string, SnapshotRow[]>();
  for (const s of snapshots) {
    const arr = snapsByProfile.get(s.profile_id);
    if (arr) arr.push(s);
    else snapsByProfile.set(s.profile_id, [s]);
  }

  const claimsByProfile = new Map<string, ClaimRow[]>();
  for (const c of claims) {
    const arr = claimsByProfile.get(c.profile_id);
    if (arr) arr.push(c);
    else claimsByProfile.set(c.profile_id, [c]);
  }

  // Pending claims (global) — the approval queue, surfaced at the top.
  const pendingClaims: AdminPendingClaim[] = claims
    .filter((c) => c.claim_kind === 'pending')
    .map((c) => {
      const p = profiles.find((pr) => pr.id === c.profile_id);
      return {
        userId: c.user_id,
        profileId: c.profile_id,
        platform: p?.platform ?? '—',
        handle: p?.handle ?? null,
        profileUrl: p?.profile_url ?? '',
        creatorName: p ? creatorName.get(p.creator_id) ?? '—' : '—',
      };
    });

  // Group profiles by creator.
  const profilesByCreator = new Map<string, ProfileRow[]>();
  for (const p of profiles) {
    const arr = profilesByCreator.get(p.creator_id);
    if (arr) arr.push(p);
    else profilesByCreator.set(p.creator_id, [p]);
  }

  const groups: AdminCreatorGroup[] = creators.map((creator) => {
    const own = profilesByCreator.get(creator.id) ?? [];
    const profileRows: AdminProfileRow[] = own.map((p) => {
      const snaps = snapsByProfile.get(p.id) ?? [];
      const latest = snaps[0];
      const prev = snaps[1];
      const pClaims = claimsByProfile.get(p.id) ?? [];
      const followers = latest?.followers != null ? Number(latest.followers) : null;
      const delta =
        latest?.followers != null && prev?.followers != null
          ? Number(latest.followers) - Number(prev.followers)
          : null;
      return {
        id: p.id,
        platform: p.platform,
        handle: p.handle,
        displayName: p.display_name,
        profileUrl: p.profile_url,
        scrapeStatus: p.scrape_status,
        followers,
        followersDelta: delta,
        views: latest?.total_views != null ? Number(latest.total_views) : null,
        ownerCount: pClaims.filter((c) => c.claim_kind === 'owner').length,
        trackerCount: pClaims.filter((c) => c.claim_kind === 'tracker').length,
        pendingCount: pClaims.filter((c) => c.claim_kind === 'pending').length,
      };
    });

    const totalReach = profileRows.reduce((a, p) => a + (p.followers ?? 0), 0);
    const reachDelta = profileRows.reduce((a, p) => a + (p.followersDelta ?? 0), 0);
    const totalViews = profileRows.reduce((a, p) => a + (p.views ?? 0), 0);
    const totalLikes = own.reduce((a, p) => {
      const likes = (snapsByProfile.get(p.id) ?? [])[0]?.total_likes;
      return a + (likes != null ? Number(likes) : 0);
    }, 0);

    return {
      creatorId: creator.id,
      displayName: creator.display_name,
      avatarUrl: creator.avatar_url,
      clientName: creator.client_id ? clientName.get(creator.client_id) ?? null : null,
      profileCount: profileRows.length,
      platforms: Array.from(new Set(profileRows.map((p) => p.platform))),
      totalReach,
      reachDelta,
      totalViews,
      engagement: totalViews > 0 ? totalLikes / totalViews : null,
      status: worstStatus(profileRows.map((p) => p.scrapeStatus)),
      profiles: profileRows,
    };
  });

  // Highest-reach accounts first — that's the agency's review priority.
  groups.sort((a, b) => b.totalReach - a.totalReach);

  return {
    groups,
    pendingClaims,
    totals: {
      creators: creators.length,
      profiles: profiles.length,
      reach: groups.reduce((a, g) => a + g.totalReach, 0),
      views: groups.reduce((a, g) => a + g.totalViews, 0),
    },
  };
}
