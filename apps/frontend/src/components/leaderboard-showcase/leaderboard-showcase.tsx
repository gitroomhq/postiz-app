'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { GlassCard } from '../ui/glass-card';
import {
  PLATFORM_ICONS,
  PLATFORM_LABELS,
  type PlatformKey,
} from '../ui/platform-icons';
import {
  compactFormatter,
  exactFormatter,
  getSortedCreators,
  handleToSlug,
  percentFormatter,
  signedPercentFormatter,
  summarize,
  type CreatorRow,
  type LeaderboardSort,
  type PlatformFilter,
} from '../dashboard-showcase/showcase-data';

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

interface SortDef {
  value: LeaderboardSort;
  label: string;
}

const SORTS: SortDef[] = [
  { value: 'followers', label: 'Followers' },
  { value: 'growth30d', label: '30d Growth' },
  { value: 'engagementRate', label: 'Engagement' },
];

function filterLabel(filter: PlatformFilter): string {
  return filter === 'all' ? 'All platforms' : PLATFORM_LABELS[filter];
}

export function LeaderboardShowcase() {
  const [filter, setFilter] = useState<PlatformFilter>('all');
  const [sortBy, setSortBy] = useState<LeaderboardSort>('followers');

  const rows = useMemo(() => getSortedCreators(filter, sortBy), [filter, sortBy]);
  const stats = useMemo(() => summarize(filter), [filter]);

  return (
    <div className="flex flex-col gap-6">
      <PlatformTabBar value={filter} onChange={setFilter} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <SummaryStat
          label="Tracked Creators"
          value={exactFormatter.format(stats.trackedCreators)}
          note={filterLabel(filter)}
        />
        <SummaryStat
          label="Combined Followers"
          value={compactFormatter.format(stats.combinedFollowers)}
          note={`${exactFormatter.format(stats.combinedFollowers)} total`}
        />
        <SummaryStat
          label="Combined 30d Growth"
          value={`+${compactFormatter.format(stats.combinedGrowth30d)}`}
          note={`Avg eng ${percentFormatter.format(stats.avgEngagementRate)}`}
        />
      </div>

      <LeaderboardCard
        rows={rows}
        sortBy={sortBy}
        onSort={setSortBy}
        filter={filter}
      />

      <p className="text-caption text-fgSubtle text-center pt-2 tabular-nums">
        Showcase preview · synthetic data. Live numbers replace this the moment the scraper switches on.
      </p>
    </div>
  );
}

// --- Tab bar (duplicate of dashboard's — design locked, ok to mirror) ----

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

// --- Summary stat (compact metric tile) -----------------------------------

interface SummaryStatProps {
  label: string;
  value: string;
  note: string;
}

function SummaryStat({ label, value, note }: SummaryStatProps) {
  return (
    <GlassCard variant="base" padding="md" radius="2xl" className="flex flex-col gap-3">
      <span className="text-micro uppercase text-fgSubtle tracking-[0.04em]">
        {label}
      </span>
      <div className="text-[clamp(24px,2.6vw,32px)] leading-[1.05] tracking-[-0.025em] font-semibold text-fg tabular-nums">
        {value}
      </div>
      <p className="text-caption text-fgMuted tabular-nums">{note}</p>
    </GlassCard>
  );
}

// --- Leaderboard card -----------------------------------------------------

interface LeaderboardCardProps {
  rows: CreatorRow[];
  sortBy: LeaderboardSort;
  onSort: (next: LeaderboardSort) => void;
  filter: PlatformFilter;
}

function LeaderboardCard({ rows, sortBy, onSort, filter }: LeaderboardCardProps) {
  return (
    <GlassCard variant="base" padding="lg" radius="2xl" className="flex flex-col">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div className="flex flex-col gap-1">
          <span className="text-micro uppercase text-fgSubtle tracking-[0.04em]">
            Creator Leaderboard
          </span>
          <span className="text-caption text-fgMuted">
            {filterLabel(filter)} · ranked by {SORTS.find((s) => s.value === sortBy)?.label.toLowerCase()}
          </span>
        </div>

        <SortSelector value={sortBy} onChange={onSort} />
      </div>

      {rows.length === 0 ? (
        <div className="grid place-items-center text-body-sm text-fgMuted py-16">
          No creators on this platform yet.
        </div>
      ) : (
        <LeaderTable rows={rows} sortBy={sortBy} />
      )}
    </GlassCard>
  );
}

// --- Sort selector --------------------------------------------------------

interface SortSelectorProps {
  value: LeaderboardSort;
  onChange: (next: LeaderboardSort) => void;
}

function SortSelector({ value, onChange }: SortSelectorProps) {
  return (
    <div
      role="tablist"
      aria-label="Sort by"
      className="inline-flex items-center gap-1 p-1 rounded-xl border border-borderGlass bg-customColor16"
    >
      {SORTS.map((s) => {
        const isActive = s.value === value;
        return (
          <button
            key={s.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(s.value)}
            className={clsx(
              'h-8 px-3 rounded-lg text-label whitespace-nowrap transition-colors duration-150 ease-out',
              isActive
                ? 'bg-customColor1 text-fg border border-borderGlassStrong'
                : 'text-fgMuted hover:text-fg'
            )}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

// --- Table ----------------------------------------------------------------

interface LeaderTableProps {
  rows: CreatorRow[];
  sortBy: LeaderboardSort;
}

function LeaderTable({ rows, sortBy }: LeaderTableProps) {
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full border-collapse text-body-sm">
        <thead>
          <tr className="text-micro uppercase tracking-[0.04em] text-fgSubtle">
            <Th className="w-[44px] text-left pl-2">#</Th>
            <Th className="text-left">Creator</Th>
            <Th className="w-[80px] text-right">Platform</Th>
            <Th
              className="w-[120px] text-right"
              active={sortBy === 'followers'}
            >
              Followers
            </Th>
            <Th
              className="w-[110px] text-right"
              active={sortBy === 'growth30d'}
            >
              30d Δ
            </Th>
            <Th
              className="w-[100px] text-right pr-2"
              active={sortBy === 'engagementRate'}
            >
              Engagement
            </Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <LeaderRow key={row.handle} row={row} sortBy={sortBy} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface ThProps {
  className?: string;
  active?: boolean;
  children: React.ReactNode;
}

function Th({ className, active, children }: ThProps) {
  return (
    <th
      className={clsx(
        'h-10 font-medium border-b border-borderGlass',
        active ? 'text-fg' : 'text-fgSubtle',
        className
      )}
      scope="col"
    >
      {children}
    </th>
  );
}

interface LeaderRowProps {
  row: CreatorRow;
  sortBy: LeaderboardSort;
}

function LeaderRow({ row, sortBy }: LeaderRowProps) {
  const Icon = PLATFORM_ICONS[row.primaryPlatform];
  const isWinner = row.rank === 1;
  const slug = handleToSlug(row.handle);
  return (
    <tr className="relative border-b border-borderGlass last:border-b-0 transition-colors duration-150 ease-out hover:bg-white/[0.025] focus-within:bg-white/[0.04]">
      <td className="h-12 pl-2 font-mono tabular-nums">
        {/* Overlay anchor: absolute inset-0 inside tr (relative) covers whole row */}
        <Link
          href={`/creators/${slug}`}
          aria-label={`View ${row.handle} profile`}
          className="absolute inset-0 outline-none focus-visible:ring-1 focus-visible:ring-brand-500 rounded-md z-0"
        />
        <span
          className={clsx(
            'relative z-10',
            isWinner ? 'text-brand font-semibold' : 'text-fgSubtle'
          )}
        >
          {String(row.rank).padStart(2, '0')}
        </span>
      </td>
      <td className="h-12 text-fg font-medium truncate max-w-[260px]">
        <span className="relative z-10">{row.handle}</span>
      </td>
      <td className="h-12 text-right">
        <span className="relative z-10 inline-flex items-center justify-end gap-2 text-fgMuted">
          <Icon size={14} />
          <span className="text-caption hidden sm:inline">
            {PLATFORM_LABELS[row.primaryPlatform as PlatformKey]}
          </span>
        </span>
      </td>
      <NumCell active={sortBy === 'followers'}>
        {compactFormatter.format(row.followers)}
      </NumCell>
      <NumCell active={sortBy === 'growth30d'}>
        +{compactFormatter.format(row.growth30d)}
      </NumCell>
      <NumCell active={sortBy === 'engagementRate'} pr>
        {signedPercentFormatter
          .format(row.engagementRate)
          .replace('+', '')}
      </NumCell>
    </tr>
  );
}

interface NumCellProps {
  active?: boolean;
  pr?: boolean;
  children: React.ReactNode;
}

function NumCell({ active, pr, children }: NumCellProps) {
  return (
    <td
      className={clsx(
        'h-12 text-right font-mono tabular-nums',
        active ? 'text-fg' : 'text-fgMuted',
        pr && 'pr-2'
      )}
    >
      {children}
    </td>
  );
}
