'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { BentoGrid, BentoItem } from '../ui/bento-grid';
import { GlassCard } from '../ui/glass-card';
import {
  PLATFORM_ICONS,
  PLATFORM_LABELS,
  type PlatformKey,
} from '../ui/platform-icons';
import { Sparkline } from './sparkline';
import {
  METRICS,
  PLATFORM_BREAKDOWN,
  compactFormatter,
  exactFormatter,
  getCreatorsForFilter,
  handleToSlug,
  percentFormatter,
  signedPercentFormatter,
  type CreatorRow,
  type MetricView,
  type PlatformBreakdown,
  type PlatformFilter,
} from './showcase-data';
import type { LivePlatformBreakdown } from '@gitroom/frontend/lib/queries';

interface TabDef {
  value: PlatformFilter;
  label: string;
}

const TABS: TabDef[] = [
  { value: 'all', label: 'All Platforms' },
  { value: 'instagram', label: PLATFORM_LABELS.instagram },
  { value: 'tiktok', label: PLATFORM_LABELS.tiktok },
  { value: 'douyin', label: PLATFORM_LABELS.douyin },
  { value: 'facebook', label: PLATFORM_LABELS.facebook },
  { value: 'xiaohongshu', label: PLATFORM_LABELS.xiaohongshu },
];

function filterLabel(filter: PlatformFilter): string {
  return filter === 'all' ? 'All platforms' : PLATFORM_LABELS[filter];
}

export interface DashboardShowcaseProps {
  /** Live creator rows from Supabase. When non-empty, drives leaderboard +
   *  derived metrics (totals, growth, engagement, active count). */
  liveCreators?: CreatorRow[] | null;
  /** Live per-platform aggregates from Supabase. When provided, merges with
   *  demo PLATFORM_BREAKDOWN: live wins per-platform, demo fills the rest
   *  so the strip always renders all five rows. */
  livePlatformBreakdown?: LivePlatformBreakdown[] | null;
}

/**
 * Derive a MetricView from live creator rows filtered by platform.
 * - growthSeries: kept from demo until we have a real time-series query
 *   (the Hero card already labels itself "Preview" for this reason).
 * - engagementRateDelta: 0 (need historical engagement to compute).
 * - All other fields computed from the filtered live set.
 */
function computeLiveMetrics(
  liveCreators: CreatorRow[],
  filter: PlatformFilter,
): MetricView {
  const filtered =
    filter === 'all'
      ? liveCreators
      : liveCreators.filter((c) => c.primaryPlatform === filter);

  const totalFollowers = filtered.reduce((s, c) => s + c.followers, 0);
  const netGrowth30d = filtered.reduce((s, c) => s + c.growth30d, 0);
  const activeCreators = filtered.length;
  const engagementRate =
    filtered.length > 0
      ? filtered.reduce((s, c) => s + c.engagementRate, 0) / filtered.length
      : 0;

  const prior = totalFollowers - netGrowth30d;
  const netGrowth30dPct = prior > 0 ? netGrowth30d / prior : 0;

  return {
    totalFollowers,
    totalFollowersDeltaPct: netGrowth30dPct,
    engagementRate,
    engagementRateDelta: 0,
    activeCreators,
    growthSeries: METRICS[filter].growthSeries, // sparkline still demo
    netGrowth30d,
    netGrowth30dPct,
  };
}

export function DashboardShowcase({
  liveCreators,
  livePlatformBreakdown,
}: DashboardShowcaseProps = {}) {
  const [filter, setFilter] = useState<PlatformFilter>('all');
  const isLive = !!(liveCreators && liveCreators.length > 0);

  const metrics = useMemo<MetricView>(
    () => (isLive ? computeLiveMetrics(liveCreators!, filter) : METRICS[filter]),
    [isLive, liveCreators, filter],
  );

  const creators = useMemo(() => {
    if (isLive) {
      const filtered =
        filter === 'all'
          ? liveCreators!
          : liveCreators!.filter((c) => c.primaryPlatform === filter);
      return filtered.map((c, i) => ({ ...c, rank: i + 1 }));
    }
    return getCreatorsForFilter(filter);
  }, [filter, liveCreators, isLive]);

  // Merge live + demo per platform so the breakdown card always shows all
  // five rows. Live wins where present; demo fills the gaps.
  const breakdownRows = useMemo<PlatformBreakdown[]>(() => {
    if (!livePlatformBreakdown || livePlatformBreakdown.length === 0) {
      return PLATFORM_BREAKDOWN;
    }
    const liveMap = new Map<PlatformKey, LivePlatformBreakdown>();
    for (const p of livePlatformBreakdown) liveMap.set(p.platform, p);
    return PLATFORM_BREAKDOWN.map((demo) => {
      const live = liveMap.get(demo.platform);
      if (!live) return demo;
      return {
        platform: demo.platform,
        followers: live.followers,
        growth30d: live.growth30d,
        // No per-platform engagement yet — keep demo as visual placeholder
        // rather than showing 0. The card has no "engagement-pending" UI.
        engagementRate: demo.engagementRate,
      };
    });
  }, [livePlatformBreakdown]);

  return (
    <div className="flex flex-col gap-6">
      <PlatformTabBar value={filter} onChange={setFilter} />

      <BentoGrid gap="md">
        <BentoItem colSpan={8} rowSpan={2} tabletColSpan={6}>
          <HeroGrowthCard filter={filter} metrics={metrics} />
        </BentoItem>

        <BentoItem colSpan={4} rowSpan={1} tabletColSpan={3}>
          <MetricCard
            label="Total Followers"
            value={compactFormatter.format(metrics.totalFollowers)}
            delta={signedPercentFormatter.format(metrics.totalFollowersDeltaPct)}
            note={`${exactFormatter.format(metrics.totalFollowers)} tracked`}
            deltaPositive={metrics.totalFollowersDeltaPct >= 0}
          />
        </BentoItem>

        <BentoItem colSpan={4} rowSpan={1} tabletColSpan={3}>
          <MetricCard
            label="Avg Engagement Rate"
            value={percentFormatter.format(metrics.engagementRate)}
            delta={signedPercentFormatter.format(metrics.engagementRateDelta)}
            note={`${metrics.activeCreators} active creator${metrics.activeCreators === 1 ? '' : 's'}`}
            deltaPositive={metrics.engagementRateDelta >= 0}
          />
        </BentoItem>

        <BentoItem colSpan={7} rowSpan={2} tabletColSpan={6}>
          <LeaderboardCard rows={creators} filter={filter} />
        </BentoItem>

        <BentoItem colSpan={5} rowSpan={2} tabletColSpan={6}>
          <PlatformBreakdownCard
            activeFilter={filter}
            onSelect={setFilter}
            rows={breakdownRows}
          />
        </BentoItem>
      </BentoGrid>

      {!isLive && (
        <p className="text-caption text-fgSubtle text-center pt-2 tabular-nums">
          Showcase preview · synthetic data. Live numbers replace this the moment the scraper switches on.
        </p>
      )}
    </div>
  );
}

// --- Tab bar --------------------------------------------------------------

interface PlatformTabBarProps {
  value: PlatformFilter;
  onChange: (next: PlatformFilter) => void;
}

function PlatformTabBar({ value, onChange }: PlatformTabBarProps) {
  return (
    <div
      role="tablist"
      aria-label="Platform filter"
      className="border border-borderGlass rounded-2xl bg-customColor1 p-1.5 flex items-center gap-1 overflow-x-auto"
    >
      {TABS.map((tab) => {
        const isActive = tab.value === value;
        const Icon = tab.value === 'all' ? null : PLATFORM_ICONS[tab.value];
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={clsx(
              'inline-flex items-center gap-2 h-9 px-3.5 rounded-xl text-label whitespace-nowrap',
              'transition-colors duration-150 ease-out',
              isActive
                ? 'bg-customColor16 text-fg border border-borderGlassStrong'
                : 'border border-transparent text-fgMuted hover:text-fg hover:bg-white/[0.04]'
            )}
          >
            {Icon ? <Icon size={14} /> : null}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// --- Hero card ------------------------------------------------------------

interface HeroGrowthCardProps {
  filter: PlatformFilter;
  metrics: typeof METRICS[PlatformFilter];
}

function HeroGrowthCard({ filter, metrics }: HeroGrowthCardProps) {
  return (
    <GlassCard variant="base" padding="lg" radius="2xl" className="h-full flex flex-col">
      <div className="flex items-start justify-between mb-6">
        <div className="flex flex-col gap-1">
          <span className="text-micro uppercase text-fgSubtle tracking-[0.04em]">
            Net Follower Growth · 30d
          </span>
          <span className="text-caption text-fgMuted">{filterLabel(filter)}</span>
        </div>
        <span className="text-caption px-2.5 py-1 rounded-md border border-borderGlass text-fgMuted font-mono">
          Preview
        </span>
      </div>

      <div className="flex items-baseline gap-4 mb-1">
        <div className="text-[clamp(44px,5.5vw,68px)] leading-[0.98] tracking-[-0.035em] font-semibold text-fg tabular-nums">
          +{compactFormatter.format(metrics.netGrowth30d)}
        </div>
        <div className="text-body-sm font-mono tabular-nums text-fgMuted">
          {signedPercentFormatter.format(metrics.netGrowth30dPct)}
        </div>
      </div>
      <div className="text-caption text-fgMuted mb-6 tabular-nums">
        {exactFormatter.format(metrics.netGrowth30d)} new followers · vs. prior 30d
      </div>

      <div className="flex-1 min-h-[160px]">
        <Sparkline
          values={metrics.growthSeries}
          ariaLabel="Daily net follower additions over the last 30 days"
        />
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-borderGlass text-caption text-fgSubtle font-mono tabular-nums">
        <span>30d ago</span>
        <span>15d</span>
        <span>Today</span>
      </div>
    </GlassCard>
  );
}

// --- Metric card ----------------------------------------------------------

interface MetricCardProps {
  label: string;
  value: string;
  delta: string;
  note: string;
  deltaPositive: boolean;
}

function MetricCard({ label, value, delta, note, deltaPositive }: MetricCardProps) {
  return (
    <GlassCard variant="base" padding="lg" radius="2xl" className="h-full flex flex-col">
      <span className="text-micro uppercase text-fgSubtle tracking-[0.04em] mb-5">
        {label}
      </span>
      <div className="flex items-baseline gap-3 mb-2">
        <div className="text-[clamp(28px,3vw,38px)] leading-[1.02] tracking-[-0.025em] font-semibold text-fg tabular-nums">
          {value}
        </div>
        <div
          className={clsx(
            'text-body-sm font-mono tabular-nums',
            deltaPositive ? 'text-fg' : 'text-fgSubtle'
          )}
        >
          {delta}
        </div>
      </div>
      <p className="text-caption text-fgMuted mt-auto tabular-nums">{note}</p>
    </GlassCard>
  );
}

// --- Leaderboard (dense text list) ----------------------------------------

interface LeaderboardCardProps {
  rows: CreatorRow[];
  filter: PlatformFilter;
}

function LeaderboardCard({ rows, filter }: LeaderboardCardProps) {
  return (
    <GlassCard variant="base" padding="lg" radius="2xl" className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div className="flex flex-col gap-1">
          <span className="text-micro uppercase text-fgSubtle tracking-[0.04em]">
            Top Creators
          </span>
          <span className="text-caption text-fgMuted">
            Ranked by 30d net growth · {filterLabel(filter)}
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex-1 grid place-items-center text-body-sm text-fgMuted py-12">
          No creators on this platform yet.
        </div>
      ) : (
        <ul className="flex-1 flex flex-col">
          <li
            aria-hidden
            className="grid grid-cols-[28px_minmax(0,1fr)_44px_92px_82px] gap-3 px-1 py-2 text-micro uppercase tracking-[0.04em] text-fgSubtle border-b border-borderGlass"
          >
            <span>#</span>
            <span>Creator</span>
            <span className="text-right">Plat</span>
            <span className="text-right">Followers</span>
            <span className="text-right">30d Δ</span>
          </li>

          {rows.map((row) => {
            const Icon = PLATFORM_ICONS[row.primaryPlatform];
            return (
              <li
                key={row.handle}
                className="border-b border-borderGlass last:border-b-0"
              >
                <Link
                  href={`/creators/${handleToSlug(row.handle)}`}
                  className="grid grid-cols-[28px_minmax(0,1fr)_44px_92px_82px] gap-3 px-1 py-3 items-center text-body-sm transition-colors duration-150 ease-out hover:bg-white/[0.025] focus-visible:bg-white/[0.04] outline-none rounded-md"
                >
                  <span className="font-mono tabular-nums text-fgSubtle">
                    {String(row.rank).padStart(2, '0')}
                  </span>
                  <span className="text-fg truncate font-medium">{row.handle}</span>
                  <span className="flex justify-end items-center text-fgMuted">
                    <Icon size={14} />
                  </span>
                  <span className="text-right font-mono tabular-nums text-fg">
                    {compactFormatter.format(row.followers)}
                  </span>
                  <span className="text-right font-mono tabular-nums text-fg">
                    +{compactFormatter.format(row.growth30d)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
}

// --- Platform breakdown ---------------------------------------------------

interface PlatformBreakdownCardProps {
  activeFilter: PlatformFilter;
  onSelect: (filter: PlatformFilter) => void;
  rows: PlatformBreakdown[];
}

function PlatformBreakdownCard({
  activeFilter,
  onSelect,
  rows,
}: PlatformBreakdownCardProps) {
  // Avoid divide-by-zero when every platform is empty; the bar widths will
  // just collapse to 0% which renders fine.
  const max = Math.max(1, ...rows.map((p) => p.followers));
  return (
    <GlassCard variant="base" padding="lg" radius="2xl" className="h-full flex flex-col">
      <div className="flex flex-col gap-1 mb-5">
        <span className="text-micro uppercase text-fgSubtle tracking-[0.04em]">
          Platform Breakdown
        </span>
        <span className="text-caption text-fgMuted">
          Followers + 30d engagement by platform
        </span>
      </div>

      <ul className="flex-1 flex flex-col gap-3">
        {rows.map((row) => {
          const Icon = PLATFORM_ICONS[row.platform];
          const widthPct = (row.followers / max) * 100;
          const isFocused = activeFilter === row.platform;
          return (
            <li key={row.platform}>
              <button
                type="button"
                onClick={() => onSelect(row.platform)}
                className={clsx(
                  'w-full text-left rounded-xl border px-3 py-3 transition-colors duration-150 ease-out',
                  isFocused
                    ? 'bg-customColor16 border-borderGlassStrong'
                    : 'bg-transparent border-borderGlass hover:border-borderGlassStrong hover:bg-white/[0.025]'
                )}
                aria-pressed={isFocused}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="inline-flex items-center justify-center size-7 rounded-md bg-customColor16 border border-borderGlass text-fg shrink-0">
                      <Icon size={14} />
                    </span>
                    <span className="text-body-sm text-fg truncate">
                      {PLATFORM_LABELS[row.platform]}
                    </span>
                  </div>
                  <span className="text-body-sm font-mono tabular-nums text-fg">
                    {compactFormatter.format(row.followers)}
                  </span>
                </div>

                <div className="h-[3px] bg-white/[0.04] rounded-full overflow-hidden">
                  <div
                    className={clsx(
                      'h-full transition-[width] duration-200 ease-out',
                      isFocused ? 'bg-brand' : 'bg-white/30'
                    )}
                    style={{ width: `${widthPct.toFixed(2)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between mt-2 text-caption text-fgMuted font-mono tabular-nums">
                  <span>Eng {percentFormatter.format(row.engagementRate)}</span>
                  <span className="text-fg">
                    +{compactFormatter.format(row.growth30d)} · 30d
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </GlassCard>
  );
}
