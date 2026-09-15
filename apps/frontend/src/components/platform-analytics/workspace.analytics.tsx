'use client';

import { FC, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Skeleton } from '@gitroom/react/ui/skeleton';
import { EmptyState } from '@gitroom/react/ui/empty-state';
import ImageWithFallback from '@gitroom/react/helpers/image.with.fallback';
import { Pagination } from '@gitroom/frontend/components/media/media.pagination';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { StatisticsModal } from '@gitroom/frontend/components/launches/statistics';
import { useViewport } from '@gitroom/frontend/components/layout/use.viewport';
import { AnalyticsPostMenu } from '@gitroom/frontend/components/platform-analytics/analytics-post-menu';
import { capChannelMix } from '@gitroom/frontend/components/platform-analytics/channel-mix';
import {
  AnalyticsPostRow,
  useAnalyticsPosts,
} from '@gitroom/frontend/components/platform-analytics/use.analytics.posts';
import { useAnalyticsSummary } from '@gitroom/frontend/components/platform-analytics/use.analytics.summary';

const formatCount = (value: number | null) => {
  if (value == null) {
    return '';
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return new Intl.NumberFormat().format(value);
};

const formatRate = (value: number | null) => {
  if (value == null) {
    return '';
  }
  return `${value.toFixed(2)}%`;
};

type ChannelSummary = {
  integrationId: string;
  platform: string;
  channelName: string;
  posts: number;
  impressions: number | null;
};

const ChannelMix: FC<{ rows: ChannelSummary[] }> = ({ rows }) => {
  const t = useT();
  const { visible, other } = useMemo(() => capChannelMix(rows), [rows]);
  const mix = useMemo(() => {
    if (!other) {
      return visible;
    }
    return [
      ...visible,
      {
        integrationId: '__other__',
        platform: 'other',
        channelName: t('plus_n_channels', '+{count} channels').replace(
          '{count}',
          String(other.count),
        ),
        posts: other.posts,
        impressions: other.impressions,
      },
    ];
  }, [other, t, visible]);
  const barMax = Math.max(...mix.map((row) => row.impressions ?? 0), 1);
  if (mix.length < 2) {
    return null;
  }
  const ringTotal = mix.reduce((sum, row) => sum + (row.impressions ?? 0), 0);
  if (ringTotal <= 0) {
    return null;
  }
  const ringColors = [
    'var(--brand)',
    'var(--ok)',
    'var(--ltSolid)',
    'var(--pink)',
    'var(--warn)',
    'var(--soft)',
  ];
  let ringCursor = 0;
  const ringStops = mix.map((row, index) => {
    const share = ((row.impressions ?? 0) / ringTotal) * 100;
    const start = ringCursor;
    ringCursor += share;
    return `${ringColors[index % ringColors.length]} ${start}% ${ringCursor}%`;
  });

  return (
    <section
      data-pq="channel-mix"
      className="rounded-pqMd bg-pqPop p-[16px] shadow-[inset_0_0_0_1px_var(--border)]"
    >
      <div className="mb-[14px] font-display text-[16px] font-[600] text-pqText">
        {t('by_channel', 'By channel')}
      </div>
      <div className="-mt-[8px] mb-[14px] text-[13px] text-pqMuted">
        {t('by_channel_hint', 'Post impressions in this period')}
      </div>
      <div className="flex items-center gap-[16px]">
        <div
          className="relative size-[92px] shrink-0 rounded-full"
          style={{
            background: `conic-gradient(${ringStops.join(', ')})`,
          }}
        >
          <div className="absolute inset-[18px] rounded-full bg-pqPop" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-[12px]">
          {mix.map((row, index) => {
            const amount = row.impressions ?? 0;
            const pct = Math.max(8, Math.round((amount / barMax) * 100));
            return (
              <div key={row.integrationId} className="flex flex-col gap-[6px]">
                <div className="flex items-center gap-[8px] text-[13px]">
                  <span
                    className="size-[8px] shrink-0 rounded-full"
                    style={{
                      background: ringColors[index % ringColors.length],
                    }}
                  />
                  <span className="min-w-0 flex-1 truncate text-pqText">
                    {row.channelName}
                  </span>
                  <span className="shrink-0 tabular-nums text-pqMuted">
                    {row.posts}
                  </span>
                  <span className="w-[48px] shrink-0 text-end tabular-nums text-pqText">
                    {amount > 0 ? formatCount(row.impressions) : ''}
                  </span>
                </div>
                <div className="h-[8px] overflow-hidden rounded-full bg-pqSettings">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: ringColors[index % ringColors.length],
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const WeekdayPulse: FC<{ counts: number[] }> = ({ counts }) => {
  const t = useT();
  const labels = [
    t('dow_mon', 'Mon'),
    t('dow_tue', 'Tue'),
    t('dow_wed', 'Wed'),
    t('dow_thu', 'Thu'),
    t('dow_fri', 'Fri'),
    t('dow_sat', 'Sat'),
    t('dow_sun', 'Sun'),
  ];
  const max = Math.max(...counts, 1);
  if (!counts.some((count) => count > 0)) {
    return null;
  }
  return (
    <section className="rounded-pqMd bg-pqPop p-[16px] shadow-[inset_0_0_0_1px_var(--border)]">
      <div className="mb-[14px] font-display text-[16px] font-[600] text-pqText">
        {t('posting_days', 'Posting days')}
      </div>
      <div className="-mt-[8px] mb-[14px] text-[13px] text-pqMuted">
        {t('posting_days_hint', 'How many posts went out each weekday')}
      </div>
      <div className="flex h-[108px] items-end gap-[8px]">
        {counts.map((count, index) => (
          <div
            key={labels[index]}
            className="flex min-w-0 flex-1 flex-col items-center gap-[6px]"
          >
            <div className="flex h-[72px] w-full items-end">
              <div
                className="w-full rounded-[6px] bg-pqBrand"
                style={{
                  height: `${Math.max(10, (count / max) * 100)}%`,
                  opacity: count ? 1 : 0.22,
                }}
              />
            </div>
            <div className="text-[11px] font-[600] text-pqMuted">
              {labels[index]}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const EngagementSplit: FC<{
  mix:
    | { reactions: number | null; comments: number | null }
    | null
    | undefined;
}> = ({ mix }) => {
  const t = useT();
  const reactions = mix?.reactions ?? null;
  const comments = mix?.comments ?? null;
  const knownTotal = (reactions ?? 0) + (comments ?? 0);
  if (!mix || knownTotal <= 0) {
    return null;
  }
  const reactionPct =
    reactions == null
      ? 0
      : comments == null
        ? 100
        : Math.round((reactions / knownTotal) * 100);
  const commentPct =
    comments == null ? null : reactions == null ? 100 : 100 - reactionPct;
  return (
    <section
      data-pq="engagement-mix"
      className="rounded-pqMd bg-pqPop p-[16px] shadow-[inset_0_0_0_1px_var(--border)]"
    >
      <div className="mb-[14px] font-display text-[16px] font-[600] text-pqText">
        {t('engagement_mix', 'Engagement mix')}
      </div>
      <div className="-mt-[8px] mb-[14px] text-[13px] text-pqMuted">
        {t('engagement_mix_hint', 'Known reactions vs comments on these posts')}
      </div>
      <div className="flex h-[14px] overflow-hidden rounded-full bg-pqSettings">
        {reactions != null && reactions > 0 && (
          <div
            className="h-full bg-pqBrand"
            style={{ width: `${reactionPct}%` }}
          />
        )}
        {comments != null && comments > 0 && (
          <div className="h-full flex-1 bg-pqOk" />
        )}
      </div>
      <div className="mt-[14px] grid grid-cols-2 gap-[12px]">
        <div>
          <div className="text-[11px] font-[600] uppercase tracking-[0.06em] text-pqMuted">
            {t('reactions', 'Reactions')}
          </div>
          <div className="mt-[4px] text-[22px] font-[600] tabular-nums text-pqText">
            {formatCount(reactions)}
          </div>
          <div className="text-[12px] text-pqMuted">
            {reactions == null ? '' : `${reactionPct}%`}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-[600] uppercase tracking-[0.06em] text-pqMuted">
            {t('comments', 'Comments')}
          </div>
          <div className="mt-[4px] text-[22px] font-[600] tabular-nums text-pqText">
            {formatCount(comments)}
          </div>
          <div className="text-[12px] text-pqMuted">
            {commentPct == null ? '' : `${commentPct}%`}
          </div>
        </div>
      </div>
    </section>
  );
};

const previewText = (content: string) =>
  content
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso));

export const WorkspaceAnalyticsGhost = () => (
  <div className="flex flex-col gap-[18px]">
    <div className="rounded-pqMd bg-pqPop p-[16px] shadow-[inset_0_0_0_1px_var(--border)]">
      <Skeleton className="mb-[12px] h-[14px] w-[92px]" />
      <div className="flex gap-[10px] overflow-hidden min-[1100px]:grid min-[1100px]:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex w-[min(220px,72vw)] shrink-0 items-center gap-[12px] rounded-[10px] bg-pqInner p-[12px] shadow-[inset_0_0_0_1px_var(--border)] min-[1100px]:w-auto"
          >
            <div className="min-w-0 flex-1 space-y-[8px]">
              <Skeleton className="h-[10px] w-[28%]" />
              <Skeleton className="h-[12px] w-[86%]" />
              <Skeleton className="h-[12px] w-[54%]" />
            </div>
            <Skeleton className="size-[56px] shrink-0 rounded-[8px]" />
          </div>
        ))}
      </div>
    </div>
    <div className="grid grid-cols-1 gap-[13px] md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-pqMd bg-pqPop p-[16px] shadow-[inset_0_0_0_1px_var(--border)]"
        >
          <Skeleton className="mb-[14px] h-[14px] w-[40%]" />
          <Skeleton className="h-[72px] w-full rounded-[8px]" />
        </div>
      ))}
    </div>
    <div className="overflow-hidden rounded-pqMd bg-pqPop shadow-[inset_0_0_0_1px_var(--border)]">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-[12px] border-t border-pqLine px-[16px] py-[12px] first:border-t-0"
        >
          <Skeleton className="size-[40px] shrink-0 rounded-[8px]" />
          <Skeleton className="h-[14px] w-[46%]" />
          <Skeleton className="ms-auto h-[14px] w-[48px]" />
        </div>
      ))}
    </div>
  </div>
);

const PostThumb: FC<{
  post: AnalyticsPostRow;
  size?: number;
  className?: string;
}> = ({ post, size = 40, className }) => (
  <span
    className={clsx('relative shrink-0 pb-[2px] pe-[2px]', className)}
    style={className ? undefined : { width: size, height: size }}
  >
    <span className="block size-full overflow-hidden rounded-[8px] bg-pqSettings">
      {post.thumbnail ? (
        <ImageWithFallback
          src={post.thumbnail}
          fallbackSrc={`/icons/platforms/${post.platform}.png`}
          width={size}
          height={size}
          className="size-full object-cover"
          alt=""
        />
      ) : (
        <span className="flex size-full items-center justify-center text-[11px] font-[600] text-pqMuted">
          {post.platform.slice(0, 1).toUpperCase()}
        </span>
      )}
    </span>
    <img
      src={`/icons/platforms/${post.platform}.png`}
      alt=""
      className="absolute -bottom-[2px] -end-[2px] size-[14px] rounded-full border border-pqInner object-cover"
    />
  </span>
);

export const WorkspaceAnalytics: FC<{
  date: number;
  integrationIds?: string;
}> = ({ date, integrationIds }) => {
  const t = useT();
  const modal = useModals();
  const { mobile } = useViewport();
  const [sort, setSort] = useState<
    'reactions' | 'comments' | 'impressions' | 'engagement' | 'published'
  >('reactions');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [topMetric, setTopMetric] = useState<'reactions' | 'comments'>(
    'reactions',
  );

  useEffect(() => {
    setPage(0);
  }, [date, integrationIds]);

  const summary = useAnalyticsSummary({
    date,
    integrationIds,
    enabled: true,
  });
  const posts = useAnalyticsPosts({
    date,
    integrationIds,
    sort,
    dir,
    page,
    enabled: true,
  });

  const isLoading =
    (summary.isLoading && !summary.data) || (posts.isLoading && !posts.data);

  const toggleSort = (next: typeof sort) => {
    setPage(0);
    if (sort === next) {
      setDir(dir === 'desc' ? 'asc' : 'desc');
      return;
    }
    setSort(next);
    setDir('desc');
  };

  const openStatistics = (postId: string) => {
    modal.openModal({
      title: t('statistics', 'Statistics'),
      closeOnClickOutside: true,
      closeOnEscape: true,
      withCloseButton: true,
      classNames: {
        modal: 'w-[100%] max-w-[1400px]',
      },
      children: <StatisticsModal postId={postId} />,
      size: '80%',
    });
  };

  if (isLoading) {
    return <WorkspaceAnalyticsGhost />;
  }

  if (summary.error || posts.error) {
    return (
      <EmptyState
        title={t(
          'analytics_posts_load_failed',
          'Could not load post analytics',
        )}
        description={t(
          'analytics_posts_load_failed_hint',
          'Something went wrong fetching post totals. Check your connection and try again.',
        )}
      />
    );
  }

  const list = posts.data;
  const totalPages = Math.max(
    1,
    Math.ceil((list?.total || 0) / (list?.limit || 20)),
  );
  const showComments = list?.columns.comments !== false;
  const showReactions = list?.columns.reactions !== false;
  const showImpressions = list?.columns.impressions !== false;
  const showEngagement = list?.columns.engagement !== false;
  const rankingByComments = topMetric === 'comments' && showComments;
  const topPosts = rankingByComments
    ? list?.topComments || list?.top || []
    : list?.topReactions || list?.top || [];
  const syncing = !!(summary.data?.syncing || list?.syncing);
  const tableColumns = `minmax(220px,1.8fr) ${
    showReactions ? 'minmax(108px,0.45fr)' : ''
  } ${showComments ? 'minmax(108px,0.45fr)' : ''} ${
    showEngagement ? 'minmax(96px,0.4fr)' : ''
  } ${showImpressions ? 'minmax(120px,0.5fr)' : ''} 40px 40px`;
  const channelMixRows = summary.data?.channels || [];
  const cappedMix = capChannelMix(channelMixRows);
  const showChannelMix = cappedMix.visible.length + (cappedMix.other ? 1 : 0) > 1;
  const weekdayCounts = summary.data?.weekdays || [];
  const showPostingDays = weekdayCounts.some((count) => count > 0);
  const engagementMix = summary.data?.engagementMix;
  const showEngagementMix = !!(
    engagementMix &&
    ((engagementMix.reactions != null && engagementMix.reactions > 0) ||
      (engagementMix.comments != null && engagementMix.comments > 0))
  );
  const trioCount =
    Number(showChannelMix) + Number(showPostingDays) + Number(showEngagementMix);
  const matchShownCount = !integrationIds;

  return (
    <div className="flex flex-col gap-[22px]">
      {syncing && (
        <div className="text-[12px] font-[600] text-pqSoft">
          {t('refreshing_analytics', 'Refreshing numbers…')}
        </div>
      )}

      <section
        data-pq="top-posts"
        className="rounded-pqMd bg-pqPop p-[16px] shadow-[inset_0_0_0_1px_var(--border)]"
      >
        <div className="mb-[12px] flex flex-wrap items-center gap-[12px]">
          <div className="min-w-0 flex-1 font-display text-[16px] font-[600] text-pqText">
            {matchShownCount && topPosts.length === 1
              ? t('top_post', 'Top post')
              : matchShownCount && topPosts.length > 1
                ? t('top_n_posts', 'Top {count} posts').replace(
                    '{count}',
                    String(topPosts.length),
                  )
                : t('top_5_posts', 'Top 5 posts')}
          </div>
          {showComments && (
            <div className="flex shrink-0 items-center gap-[3px] rounded-pqSm bg-pqSettings p-[3px]">
              {(
                [
                  ['reactions', t('reactions', 'Reactions')],
                  ['comments', t('comments', 'Comments')],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTopMetric(key)}
                  className={clsx(
                    'h-[32px] min-h-[32px] rounded-[8px] px-[15px] text-[13.5px] transition-colors',
                    mobile && 'min-h-[44px] px-[14px]',
                    (rankingByComments ? 'comments' : 'reactions') === key
                      ? 'bg-pqInner font-[600] text-pqText shadow-[inset_0_0_0_1px_var(--border)]'
                      : 'font-[500] text-pqMuted hover:text-pqText',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        {topPosts.length ? (
          <div
            className="flex snap-x snap-mandatory gap-[10px] overflow-x-auto min-[1100px]:grid min-[1100px]:overflow-visible"
            style={{
              gridTemplateColumns: `repeat(${topPosts.length}, minmax(0, 1fr))`,
            }}
          >
            {topPosts.map((post, index) => {
              const metric = rankingByComments
                ? post.comments
                : post.reactions;
              return (
                <div
                  key={post.id}
                  className={clsx(
                    'flex w-[min(220px,72vw)] shrink-0 snap-start items-center gap-[8px] rounded-[10px] bg-pqInner p-[12px] shadow-[inset_0_0_0_1px_var(--border)] transition-[box-shadow] hover:shadow-[inset_0_0_0_1px_var(--brand),var(--e2)] min-[1100px]:w-auto min-[1100px]:min-w-0',
                    index === 0 && 'shadow-[inset_0_0_0_1px_var(--ring)]',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => openStatistics(post.id)}
                    className="flex min-w-0 flex-1 items-center gap-[12px] text-start"
                  >
                    <div className="min-w-0 flex-1">
                      <div
                        className={clsx(
                          'text-[11px] font-[700] tabular-nums',
                          index === 0 ? 'text-pqBrand' : 'text-pqMuted',
                        )}
                      >
                        #{index + 1}
                      </div>
                      <div className="mt-[2px] line-clamp-2 text-[13.5px] text-pqText">
                        {previewText(post.content) ||
                          t('untitled_post', 'Untitled post')}
                      </div>
                      <div className="mt-[3px] truncate text-[12px] text-pqMuted">
                        {post.channelName} · {formatDate(post.publishDate)}
                      </div>
                      {metric != null && (
                        <div className="mt-[8px] text-[18px] font-[600] tabular-nums text-pqText">
                          {formatCount(metric)}
                          <span className="ms-[6px] text-[12px] font-[500] text-pqMuted">
                            {rankingByComments
                              ? t('comments', 'Comments')
                              : t('reactions', 'Reactions')}
                          </span>
                        </div>
                      )}
                    </div>
                    <PostThumb post={post} className="size-[56px]" />
                  </button>
                  <AnalyticsPostMenu post={post} />
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title={t('no_top_posts', 'No posts in this period')} />
        )}
      </section>

      {trioCount > 0 && (
        <div
          data-pq="analytics-trio"
          className={clsx(
            'grid grid-cols-1 gap-[13px]',
            trioCount === 2 && 'md:grid-cols-2',
            trioCount >= 3 && 'md:grid-cols-2 xl:grid-cols-3',
          )}
        >
          {showChannelMix && <ChannelMix rows={channelMixRows} />}
          {showPostingDays && <WeekdayPulse counts={weekdayCounts} />}
          {showEngagementMix && <EngagementSplit mix={engagementMix} />}
        </div>
      )}

      <section>
        <div className="mb-[10px] flex flex-wrap items-center gap-[12px]">
          <div className="min-w-0 flex-1">
            <div className="font-display text-[16px] font-[600] text-pqText">
              {t('performance_per_post', 'Performance per post')}
            </div>
            <div className="mt-[3px] text-[13px] text-pqMuted">
              {t(
                'analytics_lifetime_totals_hint',
                'Posts published in this period · current totals · Eng. % = (reactions + comments) / impressions',
              )}
            </div>
          </div>
        </div>
        {mobile ? (
          <div className="flex flex-col gap-[10px]">
            {list?.posts?.length ? (
              list.posts.map((post, index) => (
                <div
                  key={post.id}
                  className="flex flex-col gap-[12px] rounded-pqMd bg-pqPop p-[14px] shadow-[inset_0_0_0_1px_var(--border)]"
                >
                  <div className="flex min-w-0 items-center gap-[10px]">
                    <button
                      type="button"
                      onClick={() => openStatistics(post.id)}
                      className="flex min-w-0 flex-1 items-center gap-[10px] text-start"
                    >
                      <span className="w-[22px] shrink-0 text-[12px] tabular-nums text-pqMuted">
                        #{page * (list.limit || 20) + index + 1}
                      </span>
                      <PostThumb post={post} />
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 text-[14px] text-pqText">
                          {previewText(post.content) ||
                            t('untitled_post', 'Untitled post')}
                        </div>
                        <div className="truncate text-[12px] text-pqMuted">
                          {post.channelName} · {formatDate(post.publishDate)}
                        </div>
                      </div>
                    </button>
                    <AnalyticsPostMenu post={post} />
                  </div>
                  <div className="grid grid-cols-2 gap-[8px]">
                    {showReactions && formatCount(post.reactions) && (
                      <MetricChip
                        label={t('reactions', 'Reactions')}
                        value={formatCount(post.reactions)}
                      />
                    )}
                    {showComments && formatCount(post.comments) && (
                      <MetricChip
                        label={t('comments', 'Comments')}
                        value={formatCount(post.comments)}
                      />
                    )}
                    {formatRate(post.engagementRate) && (
                      <MetricChip
                        label={t('eng_rate', 'Eng. rate')}
                        value={formatRate(post.engagementRate)}
                      />
                    )}
                    {showImpressions && formatCount(post.impressions) && (
                      <MetricChip
                        label={t('impressions', 'Impressions')}
                        value={formatCount(post.impressions)}
                      />
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-pqMd bg-pqPop shadow-[inset_0_0_0_1px_var(--border)]">
                <EmptyState
                  title={t('no_post_performance', 'No posts in this period')}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-pqMd bg-pqPop shadow-[inset_0_0_0_1px_var(--border)]">
            <div className="min-w-[720px]">
              <div
                className="grid items-center gap-[8px] bg-pqTableHeader px-[16px] py-[10px] text-[11px] font-[700] uppercase tracking-[0.06em] text-pqMuted"
                style={{ gridTemplateColumns: tableColumns }}
              >
                <span>{t('post', 'Post')}</span>
                {showReactions && (
                  <SortHeader
                    label={t('reactions', 'Reactions')}
                    active={sort === 'reactions'}
                    dir={dir}
                    onClick={() => toggleSort('reactions')}
                  />
                )}
                {showComments && (
                  <SortHeader
                    label={t('comments', 'Comments')}
                    active={sort === 'comments'}
                    dir={dir}
                    onClick={() => toggleSort('comments')}
                  />
                )}
                {showEngagement && (
                  <SortHeader
                    label={t('eng_rate', 'Eng. rate')}
                    active={sort === 'engagement'}
                    dir={dir}
                    onClick={() => toggleSort('engagement')}
                  />
                )}
                {showImpressions && (
                  <SortHeader
                    label={t('impressions', 'Impressions')}
                    active={sort === 'impressions'}
                    dir={dir}
                    onClick={() => toggleSort('impressions')}
                  />
                )}
                <span />
                <span />
              </div>
              {list?.posts?.length ? (
                list.posts.map((post, index) => (
                  <div
                    key={post.id}
                    className="grid items-center gap-[8px] border-t border-pqLine px-[16px] py-[10px] hover:bg-pqHover"
                    style={{ gridTemplateColumns: tableColumns }}
                  >
                    <div className="flex min-w-0 items-center gap-[10px]">
                      <span className="w-[22px] shrink-0 text-[12px] tabular-nums text-pqMuted">
                        #{page * (list.limit || 20) + index + 1}
                      </span>
                      <PostThumb post={post} />
                      <div className="min-w-0">
                        <div className="line-clamp-2 text-[13.5px] text-pqText">
                          {previewText(post.content) ||
                            t('untitled_post', 'Untitled post')}
                        </div>
                        <div className="truncate text-[12px] text-pqMuted">
                          {post.channelName} · {formatDate(post.publishDate)}
                        </div>
                      </div>
                    </div>
                    {showReactions && (
                      <span className="text-end text-[13.5px] tabular-nums text-pqText">
                        {formatCount(post.reactions)}
                      </span>
                    )}
                    {showComments && (
                      <span className="text-end text-[13.5px] tabular-nums text-pqText">
                        {formatCount(post.comments)}
                      </span>
                    )}
                    {showEngagement && (
                      <span className="text-end text-[13.5px] tabular-nums text-pqText">
                        {formatRate(post.engagementRate)}
                      </span>
                    )}
                    {showImpressions && (
                      <span className="text-end text-[13.5px] tabular-nums text-pqText">
                        {formatCount(post.impressions)}
                      </span>
                    )}
                    <button
                      type="button"
                      className="grid size-[32px] place-items-center rounded-[8px] text-pqMuted hover:bg-pqSettings hover:text-pqText"
                      aria-label={t('statistics', 'Statistics')}
                      onClick={() => openStatistics(post.id)}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                      >
                        <path
                          d="M5 19V10M10 19V5M15 19v-7M20 19V8"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                    <AnalyticsPostMenu post={post} />
                  </div>
                ))
              ) : (
                <EmptyState
                  title={t('no_post_performance', 'No posts in this period')}
                />
              )}
            </div>
          </div>
        )}
        {(list?.total || 0) > (list?.limit || 20) &&
          (mobile ? (
            <div className="mt-[10px] flex items-center gap-[8px]">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((current) => current - 1)}
                className="min-h-[44px] flex-1 rounded-pqSm bg-pqSettings px-[12px] text-[13px] font-[600] text-pqText disabled:opacity-40"
              >
                {t('previous', 'Previous')}
              </button>
              <span className="shrink-0 px-[4px] text-[12px] tabular-nums text-pqMuted">
                {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((current) => current + 1)}
                className="min-h-[44px] flex-1 rounded-pqSm bg-pqSettings px-[12px] text-[13px] font-[600] text-pqText disabled:opacity-40"
              >
                {t('next', 'Next')}
              </button>
            </div>
          ) : (
            <Pagination
              current={page}
              totalPages={totalPages}
              setPage={setPage}
            />
          ))}
      </section>
    </div>
  );
};

const MetricChip: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-[8px] bg-pqSettings px-[10px] py-[8px]">
    <div className="text-[11px] font-[600] uppercase tracking-[0.06em] text-pqMuted">
      {label}
    </div>
    <div className="mt-[2px] text-[15px] font-[600] tabular-nums text-pqText">
      {value}
    </div>
  </div>
);

const SortHeader: FC<{
  label: string;
  active: boolean;
  dir: 'asc' | 'desc';
  onClick: () => void;
}> = ({ label, active, dir, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={clsx(
      'flex items-center justify-end gap-[4px] text-end uppercase tracking-[0.06em]',
      active ? 'text-pqText' : 'text-pqMuted hover:text-pqText',
    )}
  >
    {label}
    <span className="text-[9px]">
      {active ? (dir === 'desc' ? '▼' : '▲') : ''}
    </span>
  </button>
);
