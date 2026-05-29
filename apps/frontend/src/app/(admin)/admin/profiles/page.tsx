/**
 * /admin/profiles — agency account review, grouped by creator.
 *
 * The agency thinks in *accounts* (creators), not raw URLs. Each creator is a
 * group: account-level aggregates (reach, daily Δ, views, engagement, health)
 * with their platform profiles nested underneath. Mirrors the spec's "All
 * Creators View". A global pending-claims queue sits at the top for sign-off.
 *
 * No edit-URL action: a URL change goes through delete + re-add, because the
 * URL is what makes a profile canonical (editing in place could collide with
 * the uniqueness invariant).
 */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import { getSupabaseAdmin } from '@d3/database';
import { getAuthContext } from '@gitroom/frontend/lib/auth';
import { PlatformPill } from '@gitroom/frontend/components/ui/platform-pill';
import type { PlatformKey } from '@gitroom/frontend/components/ui/platform-icons';
import {
  getAdminCreatorsData,
  type AdminCreatorGroup,
  type AdminProfileRow,
} from '@gitroom/frontend/lib/admin-creators';
import {
  formatCompact,
  formatDelta,
  formatPercent,
} from '@gitroom/frontend/lib/creator-metrics';

import { ClaimActions, DeleteProfileButton } from './admin-actions';
import { AdminSearchForm } from './admin-search';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Admin · Accounts — D3 Creator',
};

function toPlatformKey(platform: string): PlatformKey {
  return platform === 'rednote' ? 'xiaohongshu' : (platform as PlatformKey);
}

// Yellow-mono: direction reads from a caret glyph + text intensity, never hue.
function deltaClass(n: number | null): string {
  if (n == null || n === 0) return 'text-fgSubtle';
  return n > 0 ? 'text-fg' : 'text-fgMuted';
}

function deltaCaret(n: number | null): string {
  if (n == null || n === 0) return '— ';
  return n > 0 ? '▲ ' : '▼ ';
}

// Status communicates through icon + label + yellow intensity (DESIGN.md §2),
// never a foreign hue. "ok" carries the brand tint; everything else is neutral.
type StatusGlyph = 'check' | 'clock' | 'x';

const STATUS_META: Record<string, { cls: string; glyph: StatusGlyph }> = {
  ok: { cls: 'bg-brand/10 text-fg border-brand/20', glyph: 'check' },
  pending: { cls: 'bg-white/[0.04] text-fgMuted border-white/10', glyph: 'clock' },
  throttled: { cls: 'bg-white/[0.04] text-fgMuted border-white/10', glyph: 'clock' },
  handle_changed: { cls: 'bg-white/[0.04] text-fgMuted border-white/10', glyph: 'clock' },
  private: { cls: 'bg-white/[0.04] text-fgMuted border-white/10', glyph: 'clock' },
  failed: { cls: 'bg-white/[0.04] text-fgSubtle border-white/10', glyph: 'x' },
  not_found: { cls: 'bg-white/[0.04] text-fgSubtle border-white/10', glyph: 'x' },
};

function StatusGlyphIcon({ glyph }: { glyph: StatusGlyph }) {
  const common = {
    width: 12,
    height: 12,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  if (glyph === 'check') return <svg {...common}><path d="M20 6L9 17l-5-5" /></svg>;
  if (glyph === 'x') return <svg {...common}><path d="M18 6L6 18M6 6l12 12" /></svg>;
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export default async function AdminProfilesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; platform?: string }>;
}) {
  const auth = await getAuthContext();
  if (!auth) redirect('/login');
  if (auth.role !== 'admin') redirect('/me');

  const admin = getSupabaseAdmin();
  const { groups, pendingClaims, totals } = await getAdminCreatorsData(admin);

  // URL-as-state filtering — server-side on the already-fetched data, no new
  // query. ?q= matches creator name or any profile handle; ?platform= narrows
  // to accounts running that platform.
  const { q = '', platform = '' } = await searchParams;
  const query = q.trim().toLowerCase();
  const platforms = Array.from(new Set(groups.flatMap((g) => g.platforms))).sort();
  const filteredGroups = groups.filter((g) => {
    const matchesPlatform = !platform || g.platforms.includes(platform);
    const matchesQuery =
      !query ||
      g.displayName.toLowerCase().includes(query) ||
      g.profiles.some(
        (p) =>
          (p.handle ?? '').toLowerCase().includes(query) ||
          (p.displayName ?? '').toLowerCase().includes(query),
      );
    return matchesPlatform && matchesQuery;
  });
  const chipHref = (p: string) => {
    const params = new URLSearchParams();
    if (query) params.set('q', q.trim());
    if (p) params.set('platform', p);
    const qs = params.toString();
    return qs ? `/admin/profiles?${qs}` : '/admin/profiles';
  };

  return (
    <div className="flex flex-col gap-10 pt-12 pb-24">
      <header className="max-w-[760px]">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-subtle border border-borderGlass text-caption text-aurora-cta mb-6">
          <span className="inline-block size-1.5 rounded-full bg-aurora-cta" />
          Admin · Accounts
        </span>
        <h1 className="text-display-2 text-fg mb-4">Accounts.</h1>
        <p className="text-body-lg text-fgMuted max-w-[600px]">
          One card per creator account — their platforms, reach, and growth at a
          glance. Expand to manage individual profiles. Each profile is a single
          canonical scrape target; multiple users can claim the same one with no
          duplicate scrape jobs.
        </p>
      </header>

      {/* Totals */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Creators" value={formatCompact(totals.creators)} />
        <StatCard label="Profiles" value={formatCompact(totals.profiles)} />
        <StatCard label="Total reach" value={formatCompact(totals.reach)} />
        <StatCard label="Total views" value={formatCompact(totals.views)} />
      </section>

      {/* Pending approval queue */}
      {pendingClaims.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-section text-fg">
            Pending claims ({pendingClaims.length})
          </h2>
          <p className="text-caption text-fgMuted">
            A user claimed a profile whose handle didn&apos;t auto-match. Approve to
            make them its owner, or reject.
          </p>
          <ul className="divide-y divide-borderGlass border border-borderGlass rounded-2xl overflow-hidden">
            {pendingClaims.map((c) => (
              <li
                key={`${c.userId}-${c.profileId}`}
                className="flex items-center justify-between gap-4 p-4 bg-glass-base"
              >
                <div className="min-w-0">
                  <div className="text-label text-fgMuted">
                    {c.platform} · {c.creatorName}
                  </div>
                  <div className="text-body text-fg truncate">
                    {c.handle ?? c.profileUrl}
                  </div>
                  <div className="text-caption text-fgSubtle">User: {c.userId}</div>
                </div>
                <ClaimActions userId={c.userId} profileId={c.profileId} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Accounts (creators) */}
      <section className="flex flex-col gap-4">
        <h2 className="text-section text-fg">
          All accounts ({filteredGroups.length}
          {filteredGroups.length !== groups.length ? ` of ${groups.length}` : ''})
        </h2>

        {/* Filter toolbar — URL-as-state via GET form + platform chip links */}
        <div className="flex flex-col gap-3">
          <AdminSearchForm defaultQuery={q} platform={platform} />
          {platforms.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={chipHref('')}
                scroll={false}
                className={`text-caption px-2.5 py-1 rounded-full border transition-colors ${
                  !platform
                    ? 'bg-brand/10 text-fg border-brand/20'
                    : 'bg-white/[0.04] text-fgMuted border-white/10 hover:text-fg'
                }`}
              >
                All
              </Link>
              {platforms.map((p) => (
                <Link
                  key={p}
                  href={chipHref(p)}
                  scroll={false}
                  className={`text-caption px-2.5 py-1 rounded-full border transition-colors ${
                    platform === p
                      ? 'bg-brand/10 text-fg border-brand/20'
                      : 'bg-white/[0.04] text-fgMuted border-white/10 hover:text-fg'
                  }`}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}
        </div>

        {groups.length === 0 ? (
          <div className="glass-subtle border border-borderGlass rounded-2xl p-6 text-body text-fgMuted">
            No creators yet.
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="glass-subtle border border-borderGlass rounded-2xl p-6 text-body text-fgMuted">
            No accounts match your filters.
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {filteredGroups.map((g) => (
              <CreatorCard key={g.creatorId} group={g} />
            ))}
          </div>
        )}
      </section>

      <div className="text-caption text-fgMuted">
        <Link href="/admin" className="text-aurora-cta underline underline-offset-4">
          ← Back to admin
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="glass-subtle border border-borderGlass rounded-2xl p-5">
      <div className="text-label text-fgMuted">{label}</div>
      <div className="text-section text-fg tabular-nums mt-2">{value}</div>
    </article>
  );
}

function CreatorCard({ group }: { group: AdminCreatorGroup }) {
  const initial = group.displayName.trim().charAt(0).toUpperCase() || '?';
  return (
    <article className="glass-elevated rounded-2xl overflow-hidden">
      {/* Account header */}
      <div className="p-5 flex flex-wrap items-center gap-4 border-b border-borderGlass">
        <div className="size-11 rounded-full bg-customColor1 border border-borderGlass flex items-center justify-center overflow-hidden shrink-0">
          {group.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external avatar, dims vary
            <img src={group.avatarUrl} alt="" className="size-full object-cover" />
          ) : (
            <span className="text-heading text-fgMuted">{initial}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-heading text-fg truncate">{group.displayName}</h3>
            {group.clientName && (
              <span className="text-caption text-fgSubtle px-2 py-0.5 rounded-full border border-borderGlass">
                {group.clientName}
              </span>
            )}
            <StatusPill status={group.status} />
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            {group.platforms.map((p) => (
              <PlatformPill key={p} platform={toPlatformKey(p)} iconSize={12} className="!px-2 !py-1">
                {''}
              </PlatformPill>
            ))}
            <span className="text-caption text-fgSubtle ml-1">
              {group.profileCount} profile{group.profileCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>
        {/* Account aggregates */}
        <div className="flex items-center gap-6 text-right tabular-nums shrink-0">
          <Agg label="reach" value={formatCompact(group.totalReach)} sub={`${deltaCaret(group.reachDelta)}${formatDelta(group.reachDelta)} today`} subClass={deltaClass(group.reachDelta)} />
          <Agg label="views" value={formatCompact(group.totalViews)} />
          <Agg label="engagement" value={formatPercent(group.engagement)} />
        </div>
      </div>

      {/* Profiles under this account */}
      {group.profiles.length === 0 ? (
        <div className="p-4 text-caption text-fgSubtle">No profiles on this account yet.</div>
      ) : (
        <ul className="divide-y divide-borderGlass">
          {group.profiles.map((p) => (
            <ProfileRowItem key={p.id} p={p} />
          ))}
        </ul>
      )}
    </article>
  );
}

function ProfileRowItem({ p }: { p: AdminProfileRow }) {
  return (
    <li className="flex items-center justify-between gap-4 p-4 bg-glass-base">
      <div className="flex items-center gap-3 min-w-0">
        <PlatformPill platform={toPlatformKey(p.platform)} iconSize={13} />
        <div className="min-w-0">
          <div className="text-body text-fg truncate flex items-center gap-2">
            <span className="truncate">{p.displayName ?? p.handle ?? p.profileUrl}</span>
            <StatusPill status={p.scrapeStatus} />
          </div>
          <a
            href={p.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-caption text-fgSubtle hover:text-aurora-cta underline-offset-4 hover:underline truncate block"
          >
            {p.profileUrl}
          </a>
        </div>
      </div>
      <div className="flex items-center gap-5 shrink-0 tabular-nums text-right">
        <div>
          <div className="text-body text-fg">{formatCompact(p.followers)}</div>
          <div className={`text-caption ${deltaClass(p.followersDelta)}`}>
            {deltaCaret(p.followersDelta)}
            {formatDelta(p.followersDelta)} · followers
          </div>
        </div>
        <div className="hidden sm:block text-caption text-fgSubtle">
          {p.ownerCount} owner · {p.trackerCount} tracker
          {p.pendingCount > 0 && (
            <div className="inline-flex items-center mt-0.5 px-1.5 rounded-full bg-brand/10 text-fg border border-brand/20">
              {p.pendingCount} pending
            </div>
          )}
        </div>
        <DeleteProfileButton profileId={p.id} />
      </div>
    </li>
  );
}

function Agg(props: { label: string; value: string; sub?: string; subClass?: string }) {
  return (
    <div>
      <div className="text-body text-fg">{props.value}</div>
      <div className={`text-caption ${props.subClass ?? 'text-fgSubtle'}`}>
        {props.sub ?? props.label}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? {
    cls: 'bg-white/[0.04] text-fgMuted border-white/10',
    glyph: 'clock' as StatusGlyph,
  };
  return (
    <span className={`inline-flex items-center gap-1 text-caption px-2 py-0.5 rounded-full border ${meta.cls}`}>
      <StatusGlyphIcon glyph={meta.glyph} />
      {status}
    </span>
  );
}
