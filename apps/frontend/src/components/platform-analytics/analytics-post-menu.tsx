'use client';

import { FC, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { useSWRConfig } from 'swr';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useViewport } from '@gitroom/frontend/components/layout/use.viewport';
import { useAnchoredPopover } from '@gitroom/frontend/components/layout/use.anchored.popover';
import { MobileSheet } from '@gitroom/frontend/components/layout/mobile-sheet';
import { MediaLightbox } from '@gitroom/frontend/components/media/media.lightbox';
import {
  DeletePost,
  Duplicate,
  Preview,
  usePostActions,
} from '@gitroom/frontend/components/launches/calendar';
import { useIntegrationList } from '@gitroom/frontend/components/launches/helpers/use.integration.list';
import { AnalyticsPostRow } from '@gitroom/frontend/components/platform-analytics/use.analytics.posts';

const ROW =
  'flex w-full items-center gap-[9px] rounded-pqSm px-[9px] py-[7px] text-start text-[13px] text-pqText hover:bg-pqHover';

const isAnalyticsKey = (key: unknown) =>
  typeof key === 'string' &&
  (key.startsWith('/analytics/posts') ||
    key.startsWith('/analytics/summary') ||
    key.startsWith('/analytics-'));

export const AnalyticsPostMenu: FC<{
  post: AnalyticsPostRow;
  className?: string;
}> = ({ post, className }) => {
  const t = useT();
  const { touch } = useViewport();
  const { mutate } = useSWRConfig();
  const { data: integrations } = useIntegrationList();
  const refresh = useCallback(() => {
    void mutate(isAnalyticsKey, undefined, { revalidate: true });
  }, [mutate]);
  const { editPost, deletePost } = usePostActions(refresh, {
    integrations: integrations || [],
  });
  const [open, setOpen] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const { referenceRef, floatingRef } = useAnchoredPopover<
    HTMLButtonElement,
    HTMLDivElement
  >(open && !touch, 'end');

  useEffect(() => {
    if (!open || touch) return;
    const onDown = (e: globalThis.MouseEvent) => {
      const target = e.target as Node;
      if (referenceRef.current?.contains(target)) return;
      if (floatingRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, touch, referenceRef, floatingRef]);

  const close = () => setOpen(false);
  const group = post.group || post.id;
  const loadPost = { id: post.id, group, publishDate: post.publishDate };

  const preview = () => {
    close();
    window.open(`/p/${post.id}?share=true`, '_blank');
  };
  const enlarge = () => {
    close();
    if (post.thumbnail) {
      setLightbox(true);
    }
  };
  const goToPost = () => {
    close();
    if (post.releaseURL) {
      window.open(post.releaseURL, '_blank', 'noopener,noreferrer');
    }
  };
  const duplicate = () => {
    close();
    void editPost(loadPost, true)();
  };
  const remove = () => {
    close();
    void deletePost(loadPost)();
  };

  const rows = (
    <>
      <button type="button" role="menuitem" className={ROW} onClick={preview}>
        <Preview />
        {t('preview_post', 'Preview Post')}
      </button>
      {!!post.thumbnail && (
        <button type="button" role="menuitem" className={ROW} onClick={enlarge}>
          <EnlargeIcon />
          {t('enlarge_image', 'Enlarge image')}
        </button>
      )}
      {!!post.releaseURL && (
        <button type="button" role="menuitem" className={ROW} onClick={goToPost}>
          <GoToPostIcon />
          {t('go_to_post', 'Go to post')}
        </button>
      )}
      <button type="button" role="menuitem" className={ROW} onClick={duplicate}>
        <Duplicate />
        {t('duplicate_post', 'Duplicate Post')}
      </button>
      <button
        type="button"
        role="menuitem"
        className={clsx(ROW, 'text-pqWarn hover:text-pqWarn')}
        onClick={remove}
      >
        <DeletePost />
        {t('delete_post', 'Delete Post')}
      </button>
    </>
  );

  return (
    <>
      <button
        type="button"
        ref={referenceRef}
        data-pq="analytics-post-menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('post_actions', 'Post actions')}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((current) => !current);
        }}
        className={clsx(
          'grid shrink-0 place-items-center rounded-[8px] text-pqMuted hover:bg-pqSettings hover:text-pqText',
          touch ? 'size-[44px]' : 'size-[32px]',
          className,
        )}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="19" cy="12" r="1.7" />
        </svg>
      </button>
      {open &&
        !touch &&
        createPortal(
          <div
            ref={floatingRef}
            role="menu"
            data-pq="analytics-post-menu-panel"
            onClick={(e) => e.stopPropagation()}
            className="z-[121] flex w-[220px] flex-col gap-[1px] rounded-pqMd border border-pqBorder bg-pqInner p-[6px] shadow-menu"
          >
            {rows}
          </div>,
          document.body,
        )}
      {touch && (
        <MobileSheet
          open={open}
          onClose={close}
          title={t('post_actions', 'Post actions')}
        >
          <div className="flex flex-col gap-[2px] [&_button]:min-h-[44px]">
            {rows}
          </div>
        </MobileSheet>
      )}
      {lightbox && post.thumbnail && (
        <MediaLightbox
          media={{ id: post.id, path: post.thumbnail }}
          onClose={() => setLightbox(false)}
        />
      )}
    </>
  );
};

const EnlargeIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden>
    <path
      d="M9 3H4v5M15 3h5v5M9 21H4v-5M15 21h5v-5"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const GoToPostIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden>
    <path
      d="M14 5h5v5M19 5l-9 9M10 6H6.5A1.5 1.5 0 0 0 5 7.5v10A1.5 1.5 0 0 0 6.5 19h10a1.5 1.5 0 0 0 1.5-1.5V14"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
