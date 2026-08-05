'use client';

import { FC, useEffect, useMemo, useRef } from 'react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import ImageWithFallback from '@gitroom/react/helpers/image.with.fallback';
import {
  ListStateFilter,
  useCalendar,
} from '@gitroom/frontend/components/launches/calendar.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useTourNeeds } from '@gitroom/frontend/components/onboarding/tour';
import { useViewport } from '@gitroom/frontend/components/layout/use.viewport';

/**
 * The posts panel — the design's permanent column beside the calendar.
 *
 * No new data: it is the list view's query, which already supports
 * `all | scheduled | draft | published` with paging. The three tabs are that
 * filter. The query is disabled while the panel is hidden, so the toggle saves
 * a request rather than just hiding a rendered result.
 *
 * On mobile the design treats the queue as a drawer: we collapse by default
 * when the viewport becomes phone-width, and open as an overlay so the calendar
 * keeps the full width.
 */
export const PostsPanel: FC = () => {
  const t = useT();
  const { mobile } = useViewport();
  const {
    listPosts,
    listState,
    setListState,
    postsPanelOpen,
    setPostsPanelOpen,
  } = useCalendar();
  const autoCollapsed = useRef(false);

  // The tour has a step about this panel. Collapsing it is a preference that
  // lives in a cookie for a year, and while it was collapsed that step pointed
  // at nothing. Rendering it open for the length of the step is enough; the
  // cookie is never written, so the panel goes back to collapsed by itself.
  const tourNeedsPanel = useTourNeeds('posts-panel');

  useEffect(() => {
    if (tourNeedsPanel) return;
    if (mobile && postsPanelOpen && !autoCollapsed.current) {
      autoCollapsed.current = true;
      setPostsPanelOpen(false);
      return;
    }
    if (!mobile) {
      autoCollapsed.current = false;
    }
  }, [mobile, postsPanelOpen, setPostsPanelOpen, tourNeedsPanel]);

  const tabs = useMemo(
    () =>
      [
        ['scheduled', t('scheduled', 'Scheduled')],
        ['draft', t('drafts', 'Drafts')],
        ['published', t('posted', 'Posted')],
      ] as Array<[ListStateFilter, string]>,
    [t]
  );

  const showPanel = postsPanelOpen || tourNeedsPanel;

  if (!showPanel) {
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
    <>
      {mobile && (
        <button
          type="button"
          aria-label={t('hide_posts', 'Hide posts')}
          className="fixed inset-0 z-[54] bg-black/40"
          onClick={() => setPostsPanelOpen(false)}
        />
      )}
    <div
      data-tour="posts-panel"
      className={clsx(
        'flex flex-col overflow-hidden bg-pqInner',
        mobile
          ? 'fixed inset-y-0 start-0 z-[55] w-[min(330px,86vw)] shadow-menu'
          : 'w-[300px] shrink-0 tablet:w-[248px]'
      )}
    >
      <div className="flex shrink-0 flex-col gap-[12px] px-[14px] pb-[12px] pt-[16px]">
        <div className="flex items-center gap-[8px]">
          <h2 className="flex-1 font-display text-[15px] font-[600]">
            {t('posts', 'Posts')}
          </h2>
          <button
            type="button"
            data-posts-toggle="1"
            onClick={() => setPostsPanelOpen(false)}
            className="flex h-[28px] items-center gap-[6px] rounded-pqSm border border-pqBorder px-[10px] text-[12.5px] font-[500] text-pqMuted transition-colors hover:bg-pqHover hover:text-pqText"
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              className="rtl:rotate-180"
            >
              <path
                d="M14 8l-4 4 4 4"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M4.5 4v16" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            {t('hide_posts', 'Hide posts')}
          </button>
        </div>

        <div className="flex shrink-0 gap-[2px] rounded-pqSm bg-pqSettings p-[2px]">
          {tabs.map(([value, label]) => (
            <button
              key={value}
              type="button"
              data-posts-tab={value}
              onClick={() => setListState(value)}
              className={clsx(
                'h-[28px] min-w-0 flex-1 truncate rounded-[6px] px-[4px] text-[12px] transition-colors',
                listState === value
                  ? 'bg-pqInner font-[600] text-pqText shadow-pqE1'
                  : 'font-[500] text-pqSoft hover:text-pqText'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-[6px] overflow-y-auto px-[12px] pb-[14px] scrollbar scrollbar-thumb-pqBorder scrollbar-track-pqInner">
        {!listPosts.length && (
          <div className="flex flex-1 flex-col items-center justify-center gap-[10px] px-[16px] py-[32px] text-center">
            <span className="grid size-[40px] place-items-center rounded-pqMd bg-pqSettings text-pqSoft">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                <path
                  d="M9 6.5h11M9 12h11M9 17.5h7M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div className="text-[13.5px] text-pqMuted">
              {listState === 'draft'
                ? t('no_drafts_yet', 'No drafts yet')
                : listState === 'published'
                ? t('nothing_published_yet', 'Nothing published yet')
                : t('no_posts_yet', 'No posts yet')}
            </div>
          </div>
        )}
        {listPosts.map((post: any) => (
          <div
            key={post.id}
            data-posts-item={post.id}
            className="rounded-pqMd border border-pqBorder bg-pqBg p-[10px]"
          >
            <div className="mb-[7px] flex items-center gap-[7px]">
              <span className="relative size-[24px] shrink-0">
                <ImageWithFallback
                  fallbackSrc={`/icons/platforms/${post.integration?.providerIdentifier}.png`}
                  src={post.integration?.picture || '/no-picture.jpg'}
                  alt=""
                  width={24}
                  height={24}
                  className="rounded-[7px]"
                />
                <span className="absolute -bottom-[2px] -end-[3px] grid size-[14px] place-items-center rounded-full bg-pqBadgeRing">
                  <img
                    src={`/icons/platforms/${post.integration?.providerIdentifier}.png`}
                    alt=""
                    className="size-[10px] rounded-full"
                  />
                </span>
              </span>
              <span className="min-w-0 flex-1 truncate text-[11.5px] text-pqMuted">
                {dayjs.utc(post.publishDate).local().format('ddd · HH:mm')}
              </span>
              <span
                className={clsx(
                  'flex shrink-0 items-center gap-[5px] text-[11px] font-[500]',
                  post.state === 'PUBLISHED'
                    ? 'text-pqOk'
                    : post.state === 'DRAFT'
                    ? 'text-pqSoft'
                    : 'text-pqFocused'
                )}
              >
                <span
                  className="size-[5px] rounded-full bg-current"
                  aria-hidden="true"
                />
                {post.state === 'PUBLISHED'
                  ? t('published', 'Published')
                  : post.state === 'DRAFT'
                  ? t('draft', 'Draft')
                  : t('scheduled', 'Scheduled')}
              </span>
            </div>
            <div className="line-clamp-2 text-[13px] leading-[1.5] text-pqText">
              {(post.content || '').replace(/<[^>]*>/g, ' ').trim()}
            </div>
          </div>
        ))}
      </div>
    </div>
    </>
  );
};
