/**
 * CreatorStats — the data-rich body of /me.
 *
 * Pure server component (no client JS): KPI grid, top content, and a
 * per-platform breakdown. Consumes the already-aggregated CreatorMetrics so
 * the page stays a thin orchestrator. Thumbnails route through
 * /api/proxy-image (same-origin → covered by CSP img-src 'self').
 */

import Link from 'next/link';
import { PlatformPill } from '@gitroom/frontend/components/ui/platform-pill';
import type { PlatformKey } from '@gitroom/frontend/components/ui/platform-icons';
import {
  type CreatorMetrics,
  type TopPost,
  formatCompact,
  formatDelta,
  formatPercent,
} from '@gitroom/frontend/lib/creator-metrics';

// DB stores 'rednote'; the icon set keys it as 'xiaohongshu'.
function toPlatformKey(platform: string): PlatformKey {
  return platform === 'rednote' ? 'xiaohongshu' : (platform as PlatformKey);
}

function viaProxy(url: string | null): string | null {
  if (!url || !url.startsWith('http')) return null;
  return `/api/proxy-image?url=${encodeURIComponent(url)}`;
}

function deltaClass(n: number | null): string {
  if (n == null || n === 0) return 'text-fgSubtle';
  return n > 0 ? 'text-emerald-400' : 'text-red-400';
}

export function CreatorStats({ metrics }: { metrics: CreatorMetrics }) {
  const t = metrics.totals;

  return (
    <div className="flex flex-col gap-10">
      {/* KPIs — hero followers card spans wide, rest are uniform tiles */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="col-span-2 glass-elevated rounded-2xl p-6 flex flex-col justify-between min-h-[140px]">
          <div className="text-label text-fgMuted uppercase tracking-wide">
            Total followers
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1">
            <span className="text-display-2 text-fg tabular-nums leading-none">
              {formatCompact(t.followers)}
            </span>
            <span
              className={`text-body font-medium tabular-nums ${deltaClass(
                t.followersGainedToday,
              )}`}
            >
              {formatDelta(t.followersGainedToday)} today
            </span>
          </div>
        </div>

        <Kpi label="Total views" value={formatCompact(t.views)} />
        <Kpi label="Engagement" value={formatPercent(t.engagement)} hint="likes ÷ views" />
        <Kpi label="Total likes" value={formatCompact(t.likes)} />
        <Kpi label="Posts" value={formatCompact(t.posts)} />
        <Kpi
          label="New followers today"
          value={formatDelta(t.followersGainedToday)}
          valueClass={deltaClass(t.followersGainedToday)}
        />
      </section>

      {/* Top content */}
      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-section text-fg">Top content</h2>
          <Link
            href="/me/leaderboard"
            className="text-caption text-aurora-cta underline underline-offset-4 shrink-0"
          >
            View all →
          </Link>
        </div>
        {metrics.topPosts.length === 0 ? (
          <Empty>No post data yet — your top videos appear after the first scrape.</Empty>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.topPosts.map((p, i) => (
              <TopPostCard key={p.externalPostId + i} post={p} rank={i + 1} />
            ))}
          </ul>
        )}
      </section>

      {/* Per-platform breakdown */}
      <section className="flex flex-col gap-4">
        <h2 className="text-section text-fg">By platform</h2>
        <ul className="divide-y divide-borderGlass border border-borderGlass rounded-2xl overflow-hidden">
          {metrics.profiles.map((m) => (
            <li
              key={m.profileId}
              className="flex items-center justify-between gap-4 p-4 bg-glass-base"
            >
              <div className="flex items-center gap-3 min-w-0">
                <PlatformPill platform={toPlatformKey(m.platform)} />
                <div className="min-w-0">
                  <div className="text-body text-fg truncate">
                    {m.displayName ?? m.handle ?? m.profileUrl}
                  </div>
                  <a
                    href={m.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-caption text-fgSubtle hover:text-aurora-cta underline-offset-4 hover:underline truncate block"
                  >
                    {m.profileUrl}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-6 shrink-0 text-right tabular-nums">
                <div>
                  <div className="text-body text-fg">{formatCompact(m.followers)}</div>
                  <div className={`text-caption ${deltaClass(m.followersDelta)}`}>
                    {formatDelta(m.followersDelta)} · followers
                  </div>
                </div>
                <div className="hidden sm:block">
                  <div className="text-body text-fg">{formatCompact(m.views)}</div>
                  <div className="text-caption text-fgSubtle">views</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Kpi(props: {
  label: string;
  value: string;
  hint?: string;
  valueClass?: string;
}) {
  return (
    <div className="glass-subtle border border-borderGlass rounded-2xl p-5 flex flex-col justify-between min-h-[140px]">
      <div className="text-label text-fgMuted uppercase tracking-wide">{props.label}</div>
      <div>
        <div className={`text-section text-fg tabular-nums ${props.valueClass ?? ''}`}>
          {props.value}
        </div>
        {props.hint && <div className="text-caption text-fgSubtle mt-0.5">{props.hint}</div>}
      </div>
    </div>
  );
}

function TopPostCard({ post, rank }: { post: TopPost; rank: number }) {
  const thumb = viaProxy(post.mediaUrl);
  return (
    <li className="glass-elevated rounded-2xl overflow-hidden flex flex-col">
      <div className="relative aspect-video bg-customColor1">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element -- proxied, dimensions vary by platform
          <img
            src={thumb}
            alt={post.caption ?? 'Post thumbnail'}
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-caption text-fgSubtle">
            no preview
          </div>
        )}
        <span className="absolute top-2 left-2 size-6 rounded-full bg-black/60 text-fg text-caption flex items-center justify-center tabular-nums">
          {rank}
        </span>
        <span className="absolute top-2 right-2">
          <PlatformPill platform={toPlatformKey(post.platform)} iconSize={12} className="!px-2 !py-1">
            {''}
          </PlatformPill>
        </span>
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <p className="text-body text-fg line-clamp-2 min-h-[2.5rem]">
          {post.caption ?? '(no caption)'}
        </p>
        <div className="mt-auto grid grid-cols-2 gap-x-4 gap-y-1 text-caption tabular-nums">
          <Stat label="views" value={formatCompact(post.views)} strong />
          <Stat label="engagement" value={formatPercent(post.engagement)} strong />
          <Stat label="likes" value={formatCompact(post.likes)} />
          <Stat label="comments" value={formatCompact(post.comments)} />
        </div>
      </div>
    </li>
  );
}

function Stat(props: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-fgSubtle">{props.label}</span>
      <span className={props.strong ? 'text-fg' : 'text-fgMuted'}>{props.value}</span>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass-subtle border border-borderGlass rounded-2xl p-6 text-body text-fgMuted">
      {children}
    </div>
  );
}
