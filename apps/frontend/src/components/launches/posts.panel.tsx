'use client';

import { FC, useMemo } from 'react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import ImageWithFallback from '@gitroom/react/helpers/image.with.fallback';
import {
  ListStateFilter,
  useCalendar,
} from '@gitroom/frontend/components/launches/calendar.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useTourNeeds } from '@gitroom/frontend/components/onboarding/tour';

/**
 * The posts panel — the design's permanent column beside the calendar.
 *
 * No new data: it is the list view's query, which already supports
 * `all | scheduled | draft | published` with paging. The three tabs are that
 * filter. The query is disabled while the panel is hidden, so the toggle saves
 * a request rather than just hiding a rendered result.
 */
export const PostsPanel: FC = () => {
  const t = useT();
  const {
    listPosts,
    listState,
    setListState,
    postsPanelOpen,
    setPostsPanelOpen,
  } = useCalendar();

  const tabs = useMemo(
    () =>
      [
        ['scheduled', t('scheduled', 'Scheduled')],
        ['draft', t('drafts', 'Drafts')],
        ['published', t('posted', 'Posted')],
      ] as Array<[ListStateFilter, string]>,
    [t]
  );

  // The tour has a step about this panel. Collapsing it is a preference that
  // lives in a cookie for a year, and while it was collapsed that step pointed
  // at nothing. Rendering it open for the length of the step is enough; the
  // cookie is never written, so the panel goes back to collapsed by itself.
  const tourNeedsPanel = useTourNeeds('posts-panel');

  if (!postsPanelOpen && !tourNeedsPanel) {
    return (
      <div className="flex w-[44px] shrink-0 flex-col items-center bg-pqInner py-[16px]">
        <button
          type="button"
          data-posts-toggle="1"
          onClick={() => setPostsPanelOpen(true)}
          aria-label={t('show_posts', 'Show posts')}
          title={t('show_posts', 'Show posts')}
          className="flex h-[28px] w-[28px] items-center justify-center rounded-pqSm text-pqMuted transition-colors hover:bg-pqHover hover:text-pqText"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
            <path
              d="m10 7 5 5-5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      data-tour="posts-panel"
      className="flex w-[320px] shrink-0 flex-col gap-[12px] overflow-hidden bg-pqInner p-[16px]"
    >
      <div className="flex items-center gap-[8px]">
        <h2 className="flex-1 text-[19px] font-[500]">{t('posts', 'Posts')}</h2>
        <button
          type="button"
          data-posts-toggle="1"
          onClick={() => setPostsPanelOpen(false)}
          className="flex h-[28px] items-center gap-[5px] rounded-pqSm px-[8px] text-[12px] font-[500] text-pqMuted transition-colors hover:bg-pqHover hover:text-pqText"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
            <path
              d="m14 7-5 5 5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {t('hide_posts', 'Hide posts')}
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-[2px] rounded-pqSm bg-pqSettings p-[3px]">
        {tabs.map(([value, label]) => (
          <button
            key={value}
            type="button"
            data-posts-tab={value}
            onClick={() => setListState(value)}
            className={clsx(
              'h-[28px] flex-1 rounded-[6px] text-[12.5px] transition-colors',
              listState === value
                ? 'bg-pqInner font-[600] text-pqText shadow-pqE1'
                : 'font-[500] text-pqSoft hover:text-pqText'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-[8px] overflow-y-auto scrollbar scrollbar-thumb-pqBorder scrollbar-track-pqInner">
        {!listPosts.length && (
          <div className="rounded-pqSm border border-pqBorder p-[16px] text-center text-[12.5px] text-pqMuted">
            {t('no_posts_here', 'Nothing here yet.')}
          </div>
        )}
        {listPosts.map((post: any) => (
          <div
            key={post.id}
            data-posts-item={post.id}
            className="flex flex-col gap-[8px] rounded-pqMd bg-pqBg p-[12px]"
          >
            <div className="flex items-center gap-[8px]">
              <span className="relative shrink-0">
                <ImageWithFallback
                  fallbackSrc={`/icons/platforms/${post.integration?.providerIdentifier}.png`}
                  src={post.integration?.picture || '/no-picture.jpg'}
                  alt=""
                  width={24}
                  height={24}
                  className="rounded-full"
                />
                <img
                  src={`/icons/platforms/${post.integration?.providerIdentifier}.png`}
                  alt=""
                  className="absolute -bottom-[2px] -end-[2px] h-[12px] w-[12px] rounded-full border border-pqBg"
                />
              </span>
              <span className="min-w-0 flex-1 truncate text-[12px] text-pqMuted">
                {dayjs.utc(post.publishDate).local().format('ddd · HH:mm')}
              </span>
              <span
                className={clsx(
                  'shrink-0 text-[11.5px] font-[500]',
                  post.state === 'PUBLISHED' ? 'text-pqOk' : 'text-pqFocused'
                )}
              >
                {post.state === 'PUBLISHED'
                  ? t('posted', 'Posted')
                  : post.state === 'DRAFT'
                  ? t('drafts', 'Drafts')
                  : t('scheduled', 'Scheduled')}
              </span>
            </div>
            <div className="line-clamp-3 text-[13px] leading-[1.45]">
              {(post.content || '').replace(/<[^>]*>/g, ' ').trim()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
