'use client';

import { FC, useCallback, useEffect, useMemo, useRef } from 'react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { useDrag, useDrop } from 'react-dnd';
import ImageWithFallback from '@gitroom/react/helpers/image.with.fallback';
import {
  ListStateFilter,
  useCalendar,
} from '@gitroom/frontend/components/launches/calendar.context';
import {
  DeletePost,
  Duplicate,
  EditPost,
  useDemoPostAction,
  usePostActions,
} from '@gitroom/frontend/components/launches/calendar';
import { isClientDemoPost } from '@gitroom/frontend/components/launches/ui-demo-posts';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useTourNeeds } from '@gitroom/frontend/components/onboarding/tour';
import { useViewport } from '@gitroom/frontend/components/layout/use.viewport';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';

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
 *
 * Dropping a calendar QUEUE/DRAFT card here converts it to DRAFT via
 * PUT /posts/:id/status (not date change). Posted tab rejects drops.
 */
export const PostsPanel: FC = () => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const { mobile } = useViewport();
  const {
    listPosts,
    listState,
    setListState,
    postsPanelOpen,
    setPostsPanelOpen,
    posts,
    reloadCalendarView,
  } = useCalendar();
  const autoCollapsed = useRef(false);
  const { editPost, deletePost } = usePostActions();

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
  const acceptDraftDrop =
    showPanel && (listState === 'scheduled' || listState === 'draft');

  const resolveState = useCallback(
    (item: { id: string; state?: string }) => {
      if (item.state) return item.state;
      const fromCalendar = posts.find((p: any) => p.id === item.id);
      if (fromCalendar?.state) return fromCalendar.state;
      const fromList = listPosts.find((p: any) => p.id === item.id);
      return fromList?.state as string | undefined;
    },
    [posts, listPosts]
  );

  const [{ isOver, canDrop }, dropRef] = useDrop(
    () => ({
      accept: 'post',
      canDrop: (item: { id: string; state?: string }) => {
        if (!acceptDraftDrop) return false;
        if (isClientDemoPost(item.id)) return false;
        const state = resolveState(item);
        return state === 'QUEUE' || state === 'DRAFT';
      },
      drop: async (item: { id: string; state?: string }) => {
        if (!acceptDraftDrop) return;
        if (isClientDemoPost(item.id)) return;
        const state = resolveState(item);
        if (state !== 'QUEUE' && state !== 'DRAFT') return;

        const res = await fetch(`/posts/${item.id}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'draft' }),
        });
        if (!res.ok) {
          toaster.show(
            t('something_went_wrong', 'Something went wrong'),
            'warning'
          );
          return;
        }
        toaster.show(t('moved_to_drafts', 'Moved to drafts'), 'success');
        setListState('draft');
        reloadCalendarView();
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
        canDrop: !!monitor.canDrop(),
      }),
    }),
    [
      acceptDraftDrop,
      resolveState,
      fetch,
      toaster,
      t,
      setListState,
      reloadCalendarView,
    ]
  );

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

        <div
          // @ts-ignore react-dnd drop ref
          ref={acceptDraftDrop ? dropRef : undefined}
          data-posts-drop={acceptDraftDrop ? '1' : undefined}
          className={clsx(
            'flex min-h-0 flex-1 flex-col gap-[6px] overflow-y-auto px-[12px] pb-[14px] scrollbar scrollbar-thumb-pqBorder scrollbar-track-pqInner',
            acceptDraftDrop &&
              isOver &&
              canDrop &&
              'bg-pqBrandSoft shadow-[inset_0_0_0_1px_var(--brand)]'
          )}
        >
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
              {acceptDraftDrop && (
                <div className="max-w-[200px] text-[12px] text-pqSoft">
                  {t(
                    'drop_posts_here_to_move_to_drafts',
                    'Drop a scheduled post here to move it to drafts'
                  )}
                </div>
              )}
            </div>
          )}
          {listPosts.map((post: any) => (
            <QueueCard
              key={post.id}
              post={post}
              editPost={editPost(post, false)}
              duplicatePost={editPost(post, true)}
              deletePost={deletePost(post)}
            />
          ))}
        </div>
      </div>
    </>
  );
};

/** Design queue row: click opens editor; hover Edit / Duplicate / Delete. */
const QueueCard: FC<{
  post: any;
  editPost: () => void;
  duplicatePost: () => void;
  deletePost: () => void;
}> = ({ post, editPost, duplicatePost, deletePost }) => {
  const t = useT();
  const demo = isClientDemoPost(post.id);
  const { explain: explainDemo, demoTooltip } = useDemoPostAction();
  const onEdit = useCallback(() => {
    if (demo) {
      explainDemo();
      return;
    }
    editPost();
  }, [demo, editPost, explainDemo]);
  const onDuplicate = useCallback(() => {
    if (demo) {
      explainDemo();
      return;
    }
    duplicatePost();
  }, [demo, duplicatePost, explainDemo]);
  const onDelete = useCallback(() => {
    if (demo) {
      explainDemo();
      return;
    }
    deletePost();
  }, [demo, deletePost, explainDemo]);
  const actionButton =
    'grid size-[24px] place-items-center rounded-[6px] bg-pqInner text-pqMuted transition-colors hover:text-pqText';

  const [{ opacity }, dragRef] = useDrag(
    () => ({
      type: 'post',
      item: {
        id: post.id,
        interval: !!post.intervalInDays,
        date: dayjs.utc(post.publishDate).local(),
        state: post.state,
      },
      canDrag: !demo && post.state !== 'PUBLISHED',
      collect: (monitor) => ({
        opacity: monitor.isDragging() ? 0.4 : 1,
      }),
    }),
    [demo, post.id, post.intervalInDays, post.publishDate, post.state]
  );

  return (
    <div
      // @ts-ignore
      ref={dragRef}
      data-ci="1"
      data-posts-item={post.id}
      onClick={onEdit}
      style={{ opacity }}
      className="group relative cursor-pointer rounded-pqMd border border-pqBorder bg-pqBg p-[10px] transition-colors hover:border-pqBrand"
    >
      <div className="mb-[7px] flex min-w-0 items-center gap-[7px]">
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
      <div className="line-clamp-2 pe-[72px] text-[13px] leading-[1.5] text-pqText">
        {(post.content || '').replace(/<[^>]*>/g, ' ').trim()}
      </div>
      {!!post.tags?.length && (
        <div className="mt-[7px] flex flex-wrap gap-[5px]">
          {post.tags.map(({ tag }: any) => (
            <span
              key={tag.id || tag.name}
              className="flex h-[18px] items-center gap-[4px] rounded-[5px] bg-pqSettings pe-[6px] ps-[5px] text-[10.5px] font-[600] text-pqMuted"
            >
              <span
                className="size-[5px] rounded-[2px]"
                style={{ background: tag.color }}
                aria-hidden="true"
              />
              {tag.name}
            </span>
          ))}
        </div>
      )}
      <div
        data-ci-actions="1"
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-[8px] end-[8px] z-[5] flex gap-[2px] opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100"
      >
        {post.state !== 'PUBLISHED' && (
          <button type="button" className={actionButton} onClick={onEdit}>
            <EditPost tooltip={demo ? demoTooltip : undefined} />
          </button>
        )}
        <button type="button" className={actionButton} onClick={onDuplicate}>
          <Duplicate tooltip={demo ? demoTooltip : undefined} />
        </button>
        <button
          type="button"
          className={clsx(actionButton, 'hover:text-pqWarn')}
          onClick={onDelete}
        >
          <DeletePost tooltip={demo ? demoTooltip : undefined} />
        </button>
      </div>
    </div>
  );
};
