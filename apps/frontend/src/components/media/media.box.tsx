'use client';

import React, {
  ChangeEvent,
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { hasExtension } from '@gitroom/helpers/utils/has.extension';
import type { Media } from '@gitroom/nestjs-libraries/database/prisma/generated/client';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';
import { useToaster } from '@gitroom/react/toaster/toaster';
import clsx from 'clsx';
import { VideoFrame } from '@gitroom/react/helpers/video.frame';
import { useUppyUploader } from '@gitroom/frontend/components/media/new.uploader';
import { DropFiles } from '@gitroom/frontend/components/layout/drop.files';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useDateFormat } from '@gitroom/frontend/components/launches/helpers/date.format';
import { ThirdPartyMediaLibrary } from '@gitroom/frontend/components/third-parties/third-party.media-library';
import { UppyProgress } from '@gitroom/react/helpers/uppy.progress';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { MediaLightbox } from '@gitroom/frontend/components/media/media.lightbox';
import { Pagination } from '@gitroom/frontend/components/media/media.pagination';
import { MediaComponentInner } from '@gitroom/frontend/components/launches/helpers/media.settings.component';
import { useAnchoredPopover } from '@gitroom/frontend/components/layout/use.anchored.popover';
import { NoChannelsArt } from '@gitroom/frontend/components/ui/no-channels-art';
import { Skeleton } from '@gitroom/react/ui/skeleton';
import { Spinner } from '@gitroom/react/ui/spinner';
import { createPortal } from 'react-dom';
import { useViewport } from '@gitroom/frontend/components/layout/use.viewport';

const MAX_UPLOAD_SIZE = 1024 * 1024 * 1024; // 1 GB

/** Grid tiles are square. `4/3` made a portrait photo look like a banner. */
export const MEDIA_LIBRARY_THUMB_ASPECT = 'aspect-square';
/** Out of flow so a landscape file cannot stretch the cell. Crop, don't squash. */
export const MEDIA_LIBRARY_THUMB_FILL = 'absolute inset-0 h-full w-full';
/** Desktop picker sheet: header + two square rows + footer, without clipping row 2. */
export const MEDIA_LIBRARY_PICKER_HEIGHT = 'min(760px, 86vh)';
/** 140px tile + caption + gap, twice — the gallery never shrinks below two rows. */
export const MEDIA_LIBRARY_TWO_ROW_MIN = 'min(348px,42vh)';

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

type MediaRow = Media & {
  meta?: string;
  duration?: string;
  modified?: string;
  fileSize?: number;
};

const isVideoMedia = (media: { path: string }) =>
  hasExtension(media.path, 'mp4') || /\.webm$/i.test(media.path);

const mediaFormatLabel = (media: {
  path: string;
  originalName?: string | null;
  name?: string;
  meta?: string;
}) => {
  if (media.meta) return media.meta.split('·')[0].trim();
  if (isVideoMedia(media)) return 'MP4';
  const name = media.originalName || media.name || media.path;
  const ext = name.split('.').pop()?.toUpperCase();
  return ext && ext.length <= 5 ? ext : 'Image';
};

const mediaSizeLabel = (media: { fileSize?: number }) =>
  media.fileSize && media.fileSize > 0 ? formatSize(media.fileSize) : '—';

const UploadArrowIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
    <path
      d="M12 16V4M7.5 8.5 12 4l4.5 4.5M4 20h16"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const GridIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
    <path
      d="M4.5 4.5h6v6h-6v-6ZM13.5 4.5h6v6h-6v-6ZM4.5 13.5h6v6h-6v-6ZM13.5 13.5h6v6h-6v-6Z"
      stroke="currentColor"
      strokeWidth="1.7"
    />
  </svg>
);

const ListIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
    <path
      d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const MediaThumb: FC<{ media: MediaRow; className?: string }> = ({
  media,
  className,
}) => {
  const mediaDirectory = useMediaDirectory();
  const video = isVideoMedia(media);
  if (video) {
    return (
      <div className={clsx('h-full w-full', className)}>
        <VideoFrame url={mediaDirectory.set(media.path)} />
      </div>
    );
  }
  return (
    <div className={clsx('h-full w-full', className)}>
      <img
        className="h-full w-full object-cover"
        src={mediaDirectory.set(media.path)}
        alt={media.originalName || media.name || 'media'}
        decoding="async"
      />
    </div>
  );
};

export const MediaBox: FC<{
  setMedia: (params: { id: string; path: string }[]) => void;
  /** Already on the post — shown selected; cannot be re-added. */
  attachedMedia?: Array<{ id: string; path: string }>;
  standalone?: boolean;
  type?: 'image' | 'video';
  closeModal: () => void;
}> = ({ type, standalone, setMedia, attachedMedia, closeModal }) => {
  const [page, setPage] = useState(0);
  const [tab, setTab] = useState<'all' | 'image' | 'video'>(type ?? 'all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [lightbox, setLightbox] = useState<MediaRow | null>(null);
  const [menuMedia, setMenuMedia] = useState<MediaRow | null>(null);
  const menuOpen = !!menuMedia;
  const { formatDate } = useDateFormat();
  const { referenceRef: menuTriggerRef, floatingRef: menuFloatingRef } =
    useAnchoredPopover<HTMLButtonElement, HTMLDivElement>(menuOpen, 'end');
  // Standalone and unrestricted pickers use All/Images/Video. A `type` prop
  // from the composer locks the library to that media kind.
  const activeType = type ?? (tab === 'all' ? undefined : tab);
  const fetch = useFetch();
  const modals = useModals();
  const toaster = useToaster();
  const t = useT();
  const { mobile, touch } = useViewport();
  const uploaderRef = useRef<HTMLInputElement>(null);
  const mediaDirectory = useMediaDirectory();
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<{ id: string; path: string }[]>(
    []
  );
  const attachedIds = useMemo(
    () => new Set((attachedMedia || []).map((m) => m.id)),
    [attachedMedia]
  );

  const loadMedia = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page + 1) });
    return (await fetch(`/media?${params.toString()}`)).json();
  }, [page, fetch]);

  // The key carries the page, so without `keepPreviousData` every page click
  // emptied the grid and unmounted the pager the click had just landed on.
  const { data, mutate, isLoading } = useSWR(`get-media-${page}`, loadMedia, {
    keepPreviousData: true,
  });

  const sourceRows: MediaRow[] = useMemo(() => {
    return (data?.results || []) as MediaRow[];
  }, [data]);

  const visibleMedia: MediaRow[] = useMemo(() => {
    return sourceRows.filter((f) => {
      const video = isVideoMedia(f);
      if (activeType === 'video' && !video) return false;
      if (activeType === 'image' && video) return false;
      return true;
    });
  }, [sourceRows, activeType]);

  const uppy = useUppyUploader({
    allowedFileTypes:
      type == 'image'
        ? 'image/*'
        : type == 'video'
        ? 'video/mp4'
        : 'image/*,video/mp4',
    onUploadSuccess: async (arr) => {
      await mutate();
      const uploaded = Array.isArray(arr) ? arr.length : 0;
      if (uploaded > 0) {
        toaster.show(
          uploaded === 1
            ? t('media_upload_complete_one', '1 file uploaded.')
            : t('media_upload_complete', '{{count}} files uploaded.').replace(
                '{{count}}',
                String(uploaded)
              ),
          { kind: 'success', title: t('upload_complete', 'Upload complete') }
        );
      }
      if (standalone) {
        setPage(0);
        return;
      }
      // Auto-select fresh uploads (no hard picker cap — matches origin/main).
      setSelected((prevSelected) => {
        const fresh = (
          arr as Array<{ id: string; path: string }>
        ).filter(
          (a: { id: string; path: string }) =>
            !attachedIds.has(a.id) &&
            !prevSelected.some((p) => p.id === a.id)
        );
        return [
          ...prevSelected,
          ...fresh.map((a: { id: string; path: string }) => ({
            id: a.id,
            path: a.path,
          })),
        ];
      });
    },
    onStart: () => setLoading(true),
    onEnd: () => setLoading(false),
  });

  const enqueueFiles = useCallback(
    (files: File[]) => {
      if (!files.length) return;
      const totalSize = files.reduce((acc, file) => acc + file.size, 0);
      if (totalSize > MAX_UPLOAD_SIZE) {
        toaster.show(
          t(
            'upload_size_limit_exceeded',
            'Upload size limit exceeded. Maximum 1 GB per upload session.'
          ),
          'warning'
        );
        return;
      }
      setLoading(true);
      for (const file of files) {
        uppy.addFile(file);
      }
    },
    [toaster, t, uppy]
  );

  const dragAndDrop = useCallback(
    (files: File[]) => {
      enqueueFiles(files);
    },
    [enqueueFiles]
  );

  // Paste files onto the media surface (design: "paste or browse").
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items?.length) return;
      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length) {
        e.preventDefault();
        enqueueFiles(files);
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [enqueueFiles]);

  const addRemoveSelected = useCallback(
    (media: MediaRow) => () => {
      if (standalone) return;
      if (attachedIds.has(media.id)) {
        toaster.show(
          t(
            'media_already_on_post',
            'This media is already on the post.'
          ),
          'warning'
        );
        return;
      }
      const exists = selected.find((p) => p.id === media.id);
      if (exists) {
        setSelected(selected.filter((f) => f.id !== media.id));
        return;
      }
      setSelected([
        ...selected,
        { id: media.id, path: media.path },
      ]);
    },
    [selected, standalone, toaster, t, attachedIds]
  );

  const addMedia = useCallback(async () => {
    if (standalone) return;
    const real = selected.filter((s) => !attachedIds.has(s.id));
    if (real.length === 0) return;
    setMedia(real);
    closeModal();
    modals.closeCurrent();
  }, [selected, standalone, setMedia, modals, attachedIds, closeModal]);

  const addToUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      enqueueFiles(Array.from(e.target.files || []));
      e.target.value = '';
    },
    [enqueueFiles]
  );

  const openLightbox = useCallback(
    (media: MediaRow) => (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setMenuMedia(null);
      setLightbox(media);
    },
    []
  );

  const deleteImage = useCallback(
    (media: MediaRow) => async (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setMenuMedia(null);
      if (
        !(await deleteDialog(
          t(
            'are_you_sure_you_want_to_delete_the_image',
            'Are you sure you want to delete the image?'
          )
        ))
      ) {
        return;
      }
      const res = await fetch(`/media/${media.id}`, { method: 'DELETE' });
      if (!res.ok) {
        toaster.show(
          t('something_went_wrong', 'Something went wrong'),
          'warning'
        );
        return;
      }
      setLightbox(null);
      setSelected((prev) => prev.filter((s) => s.id !== media.id));
      mutate();
      toaster.show(t('media_deleted', 'Media deleted'), 'success');
    },
    [mutate, fetch, toaster, t]
  );

  const downloadMedia = useCallback(
    (media: MediaRow) => () => {
      const url = mediaDirectory.set(media.path);
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    [mediaDirectory]
  );

  const openAltText = useCallback(
    (media: MediaRow) => (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setMenuMedia(null);
      modals.openModal({
        title: t('change_alt_text', 'Change alt text'),
        children: (close) => (
          <MediaComponentInner
            media={media as any}
            onClose={close}
            onSelect={() => {
              mutate();
              close();
            }}
          />
        ),
      });
    },
    [modals, t, mutate]
  );

  const openMenu = useCallback(
    (media: MediaRow) => (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (menuMedia?.id === media.id) {
        setMenuMedia(null);
        return;
      }
      // Point Floating UI at the clicked ⋯ (many tiles share one popover).
      menuTriggerRef.current = e.currentTarget;
      setMenuMedia(media);
    },
    [menuMedia, menuTriggerRef]
  );

  const brandUploadBtn = (size: 'page' | 'picker' = 'page') => (
    <button
      type="button"
      disabled={loading}
      onClick={() => uploaderRef.current?.click()}
      className={clsx(
        'relative flex shrink-0 cursor-pointer items-center gap-[7px] bg-pqBrand font-[600] text-pqOnBrand transition-colors hover:bg-pqBrandHover disabled:opacity-70',
        size === 'picker'
          ? 'h-[44px] rounded-[8px] px-[18px] text-[14px]'
          : touch
            ? 'h-[44px] rounded-pqSm px-[16px] ps-[14px] text-[13.5px]'
            : 'h-[36px] rounded-pqSm px-[14px] ps-[12px] text-[13px]'
      )}
    >
      {loading ? (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-pqOnBrand">
          <Spinner width={16} height={16} />
        </div>
      ) : (
        <UploadArrowIcon />
      )}
      <span className={loading ? 'invisible' : undefined}>
        {t('upload', 'Upload')}
      </span>
    </button>
  );

  const fileInput = (
    <input
      type="file"
      ref={uploaderRef}
      onChange={addToUpload}
      className="hidden"
      multiple={true}
      accept={
        type == 'image'
          ? 'image/*'
          : type == 'video'
          ? 'video/mp4'
          : 'image/*,video/mp4'
      }
    />
  );

  // Keep Dashboard mounted for progress, but collapse height when idle so it
  // never leaves a blank strip between the filter row and the gallery.
  // LOOK: light progress strip (design uploaderOpen), not a dark status chrome.
  const uppyBar = (
    <div
      className={clsx(
        'pointer-events-none relative w-full overflow-hidden transition-[height,margin]',
        loading ? 'mb-[8px] mt-[2px] h-[40px]' : 'm-0 h-0'
      )}
      aria-hidden={!loading}
      aria-live="polite"
    >
      <div
        className={clsx(
          'uppyChange absolute left-0 h-[40px] w-full overflow-hidden rounded-pqSm bg-pqSettings px-[10px]',
          loading && 'animate-pqFadeDown'
        )}
      >
        <UppyProgress
          height={40}
          uppy={uppy}
          id={`uploader-${standalone ? 'page' : 'picker'}`}
        />
      </div>
    </div>
  );

  const viewToggle = (
    <div className="flex shrink-0 items-center gap-[2px] rounded-pqSm bg-pqSettings p-[3px]">
      <button
        type="button"
        data-media-view="grid"
        title={t('grid', 'Grid')}
        onClick={() => setView('grid')}
        className={clsx(
          'grid h-[26px] w-[28px] place-items-center rounded-[6px]',
          view === 'grid'
            ? 'bg-pqInner text-pqText'
            : 'bg-transparent text-pqSoft hover:text-pqText'
        )}
      >
        <GridIcon />
      </button>
      <button
        type="button"
        data-media-view="list"
        title={t('list', 'List')}
        onClick={() => setView('list')}
        className={clsx(
          'grid h-[26px] w-[28px] place-items-center rounded-[6px]',
          view === 'list'
            ? 'bg-pqInner text-pqText'
            : 'bg-transparent text-pqSoft hover:text-pqText'
        )}
      >
        <ListIcon />
      </button>
    </div>
  );

  const standaloneFilterTabs = (
    <div className="flex items-center gap-[3px] rounded-pqSm bg-pqSettings p-[3px]">
      {(
        [
          ['all', t('all', 'All')],
          ['image', t('images', 'Images')],
          ['video', t('video', 'Video')],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          type="button"
          data-media-tab={value}
          onClick={() => setTab(value)}
          className={clsx(
            'rounded-[6px] px-[11px] text-[12.5px] transition-colors',
            touch ? 'h-[44px] min-h-[44px] px-[14px]' : 'h-[26px]',
            tab === value
              ? 'bg-pqInner font-[600] text-pqText'
              : 'font-[500] text-pqMuted hover:text-pqText'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const showEmptyState = !isLoading && visibleMedia.length === 0;

  // --- Standalone /media page (design pagesVals isMedia) -------------------
  if (standalone) {
    return (
      <DropFiles
        disabled={loading}
        noClick
        brandOverlay
        className="relative flex min-h-0 flex-1 flex-col overflow-y-auto bg-pqInner px-[22px] pt-[8px] pb-[28px] scrollbar scrollbar-thumb-pqBorder scrollbar-track-pqInner mobile:px-[14px]"
        onDrop={dragAndDrop}
      >
        {fileInput}
        <div className="mx-auto flex w-full max-w-[980px] flex-col gap-[10px] pe-[14px]">
          {/* Import first, Upload last (owner): the primary action holds the
              trailing edge, which is also where the design ends this toolbar. */}
          <div className="flex flex-wrap items-center justify-end gap-[10px]">
            <ThirdPartyMediaLibrary size="page" onImported={() => mutate()} />
            {brandUploadBtn('page')}
          </div>

          {uppyBar}

          <div className="flex flex-col gap-[10px]">
            {!mobile && (
            <button
              type="button"
              disabled={loading}
              onClick={() => uploaderRef.current?.click()}
              className={clsx(
                'flex w-full shrink-0 cursor-pointer flex-col items-center justify-center gap-[10px] rounded-[16px] border-[1.5px] border-dashed bg-pqBrandFaint px-[20px] py-[26px] font-inherit transition-colors hover:border-pqBrand hover:bg-pqBrandSoft disabled:cursor-wait',
                loading ? 'border-pqBrand bg-pqBrandSoft' : 'border-pqBorder'
              )}
            >
              <span
                className={clsx(
                  'grid h-[48px] w-[48px] place-items-center rounded-[15px] bg-pqBrand text-pqOnBrand shadow-pqE2',
                  loading && 'pq-loop animate-pulse'
                )}
              >
                {loading ? (
                  <Spinner width={22} height={22} />
                ) : (
                  <svg viewBox="0 0 24 24" width="23" height="23" fill="none">
                    <path
                      d="M12 16V4M7.5 8.5 12 4l4.5 4.5M4 20h16"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <span className="flex flex-col items-center gap-[4px]">
                <span className="text-[15px] font-[600] text-pqText">
                  {loading
                    ? t('uploading_media', 'Uploading media…')
                    : t(
                        'drop_files_here_paste_or_browse',
                        'Drop files here, paste or browse'
                      )}
                </span>
                <span className="text-[12.5px] text-pqMuted">
                  {loading
                    ? t(
                        'upload_progress_keep_open',
                        'Keep this window open until the upload finishes'
                      )
                    : t(
                        'maximum_size_allowed_1gb_images_video',
                        'Maximum size allowed is 1 GB · images and video'
                      )}
                </span>
              </span>
            </button>
            )}

            {/* Filters + view — under drop zone, above gallery (owner) */}
            <div className="flex flex-wrap items-center gap-[10px]">
              {standaloneFilterTabs}
              <div className="min-w-0 flex-1" />
              {viewToggle}
            </div>

              {showEmptyState ? (
                <div className="flex flex-col items-center gap-[14px] px-0 py-[48px] text-center">
                  <NoChannelsArt className="h-auto w-[200px]" />
                  <div className="flex max-w-[300px] flex-col gap-[6px]">
                    <div className="text-[18px] font-[600] text-pqText">
                      {t('nothing_here_yet', 'Nothing here yet')}
                    </div>
                    <div className="text-[13.5px] leading-[1.55] text-pqMuted text-balance">
                      {mobile
                        ? t(
                            'maximum_size_allowed_1gb_images_video',
                            'Maximum size allowed is 1 GB · images and video'
                          )
                        : t(
                            'upload_images_or_video_or_drag',
                            'Upload images or video, or drag files straight onto this page. Up\u00a0to 1 GB per upload.'
                          )}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => uploaderRef.current?.click()}
                    className={clsx(
                      'mt-[2px] rounded-pqSm bg-pqBrand px-[16px] text-[13.5px] font-[600] text-pqOnBrand transition-colors hover:bg-pqBrandHover disabled:opacity-70',
                      touch ? 'h-[44px] min-h-[44px] px-[18px]' : 'h-[36px]'
                    )}
                  >
                    {t('upload_media', 'Upload media')}
                  </button>
                </div>
              ) : (
                <>
                {isLoading && !data && (
                  <div className={clsx(
                    'grid gap-x-[14px] gap-y-[14px]',
                    mobile
                      ? 'grid-cols-[repeat(auto-fill,minmax(140px,1fr))]'
                      : 'grid-cols-[repeat(auto-fill,minmax(168px,1fr))]'
                  )}>
                    {[...new Array(8)].map((_, i) => (
                      <Skeleton
                        key={i}
                        className={clsx(
                          MEDIA_LIBRARY_THUMB_ASPECT,
                          'rounded-[10px]'
                        )}
                      />
                    ))}
                  </div>
                )}

                {view === 'grid' && (
                  <div
                    className={clsx(
                      'grid items-start gap-x-[14px] gap-y-[14px]',
                      mobile
                        ? 'grid-cols-[repeat(auto-fill,minmax(140px,1fr))]'
                        : 'grid-cols-[repeat(auto-fill,minmax(168px,1fr))]'
                    )}
                    data-pq="media-grid"
                  >
                    {visibleMedia.map((media) => {
                      const menuOpenForItem = menuMedia?.id === media.id;
                      return (
                      <div
                        key={media.id}
                        data-ci="1"
                        onClick={openLightbox(media)}
                        className="group flex cursor-pointer flex-col gap-0.5"
                      >
                        <div
                          className={clsx(
                            'relative w-full overflow-hidden rounded-[10px] bg-pqSettings outline outline-1 outline-pqBorder -outline-offset-1 transition-[outline-color] group-hover:outline-pqBrand',
                            MEDIA_LIBRARY_THUMB_ASPECT
                          )}
                        >
                          <MediaThumb
                            media={media}
                            className={MEDIA_LIBRARY_THUMB_FILL}
                          />
                          {isVideoMedia(media) && (
                            <span className="absolute bottom-[7px] end-[7px] flex h-[19px] items-center gap-[4px] rounded-[5px] bg-black/72 px-[6px] text-[10px] font-[600] tabular-nums text-white">
                              {media.duration || t('video', 'Video')}
                            </span>
                          )}
                          <div
                            data-ci-actions="1"
                            className={clsx(
                              'absolute top-[6px] end-[6px] transition-opacity',
                              menuOpenForItem
                                ? 'opacity-100'
                                : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                            )}
                          >
                            <button
                              type="button"
                              onClick={openMenu(media)}
                              title={t('more', 'More')}
                              className="grid size-[28px] place-items-center rounded-full bg-black/65 text-white backdrop-blur-[2px] hover:bg-black/80"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                width="16"
                                height="16"
                                fill="none"
                              >
                                <path
                                  d="M12 6.5h.01M12 12h.01M12 17.5h.01"
                                  stroke="currentColor"
                                  strokeWidth="2.4"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="flex items-baseline justify-between gap-[8px] px-[2px] text-[11px] leading-[1.35] tabular-nums text-pqMuted">
                          <span className="min-w-0 truncate uppercase">
                            {mediaFormatLabel(media)}
                          </span>
                          <span className="shrink-0">
                            {mediaSizeLabel(media)}
                          </span>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}

                {view === 'list' && (
                  <div className="flex flex-col" data-pq="media-list">
                    <div className="flex items-center gap-[12px] border-b border-pqLine px-[8px] pb-[9px] pt-[2px] text-[11px] font-[600] uppercase tracking-[0.05em] text-pqSoft">
                      <span className="w-[36px] shrink-0" />
                      <span className="min-w-0 flex-1">
                        {t('alt_text', 'Alt text')}
                      </span>
                      {!mobile && (
                        <>
                      <span className="w-[64px] shrink-0">
                        {t('format', 'Format')}
                      </span>
                      <span className="w-[110px] shrink-0">
                        {t('upload_date', 'Upload date')}
                      </span>
                      <span className="w-[80px] shrink-0 text-end">
                        {t('size', 'Size')}
                      </span>
                        </>
                      )}
                      <span className="w-[36px] shrink-0" />
                    </div>
                    {visibleMedia.map((media) => (
                      <div
                        key={media.id}
                        data-media-row={media.id}
                        data-ci="1"
                        onClick={openLightbox(media)}
                        className="group flex min-h-[44px] cursor-pointer items-center gap-[12px] rounded-pqSm border-b border-pqLine p-[8px] hover:bg-pqHover"
                      >
                        <span className="grid h-[36px] w-[36px] shrink-0 place-items-center overflow-hidden rounded-[8px] bg-pqSettings outline outline-1 outline-pqBorder -outline-offset-1">
                          <MediaThumb media={media} />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[13px] text-pqText">
                          {media.alt?.trim()
                            ? media.alt
                            : t('no_alt_text', '—')}
                        </span>
                        {!mobile && (
                          <>
                        <span className="w-[64px] shrink-0 text-[12.5px] uppercase tabular-nums text-pqMuted">
                          {mediaFormatLabel(media)}
                        </span>
                        <span className="w-[110px] shrink-0 text-[12.5px] text-pqMuted">
                          {media.modified ||
                            (media.createdAt
                              ? formatDate(media.createdAt)
                              : '—')}
                        </span>
                        <span className="w-[80px] shrink-0 text-end text-[12.5px] tabular-nums text-pqMuted">
                          {mediaSizeLabel(media)}
                        </span>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={openMenu(media)}
                          className="grid h-[28px] w-[28px] shrink-0 place-items-center rounded-[8px] bg-transparent text-pqSoft hover:bg-pqSettings hover:text-pqText"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="16"
                            height="16"
                            fill="none"
                          >
                            <path
                              d="M12 6.5h.01M12 12h.01M12 17.5h.01"
                              stroke="currentColor"
                              strokeWidth="2.4"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {(data?.pages || 0) > 1 && (
                  <div className="px-0 pb-[4px] pt-[16px]">
                    <Pagination
                      current={page}
                      totalPages={data.pages}
                      setPage={setPage}
                    />
                  </div>
                )}
                </>
              )}
            </div>
        </div>

        {menuMedia &&
          createPortal(
            <>
              <div
                className="fixed inset-0 z-[400]"
                onClick={() => setMenuMedia(null)}
              />
              <div
                ref={menuFloatingRef}
                className="z-[401] flex w-[200px] flex-col gap-[2px] rounded-[12px] bg-pqPop p-[6px] shadow-pqE3 shadow-[inset_0_0_0_1px_var(--border)]"
              >
                <button
                  type="button"
                  className="rounded-[8px] px-[10px] py-[8px] text-start text-[13px] text-pqText hover:bg-pqHover"
                  onClick={openLightbox(menuMedia)}
                >
                  {t('preview', 'Preview')}
                </button>
                <button
                  type="button"
                  className="rounded-[8px] px-[10px] py-[8px] text-start text-[13px] text-pqText hover:bg-pqHover"
                  onClick={() => {
                    downloadMedia(menuMedia)();
                    setMenuMedia(null);
                  }}
                >
                  {t('download', 'Download')}
                </button>
                <button
                  type="button"
                  className="rounded-[8px] px-[10px] py-[8px] text-start text-[13px] text-pqText hover:bg-pqHover"
                  onClick={openAltText(menuMedia)}
                >
                  {t('change_alt_text', 'Change alt text')}
                </button>
                <button
                  type="button"
                  className="rounded-[8px] px-[10px] py-[8px] text-start text-[13px] text-pqWarn hover:bg-pqHover"
                  onClick={deleteImage(menuMedia)}
                >
                  {t('delete', 'Delete')}
                </button>
              </div>
            </>,
            document.body
          )}

        {lightbox && (
          <MediaLightbox
            media={lightbox}
            onClose={() => setLightbox(null)}
            onDownload={downloadMedia(lightbox)}
            onDelete={() => deleteImage(lightbox)()}
          />
        )}
      </DropFiles>
    );
  }

  const filterTabs = !type ? (
    <div className="flex items-center gap-[3px] rounded-pqSm bg-pqSettings p-[3px]">
      {(
        [
          ['all', t('all', 'All')],
          ['image', t('images', 'Images')],
          ['video', t('video', 'Video')],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          type="button"
          data-media-tab={value}
          onClick={() => setTab(value)}
          className={clsx(
            'rounded-[6px] px-[11px] text-[12.5px] transition-colors',
            touch ? 'h-[44px] min-h-[44px] px-[14px]' : 'h-[26px]',
            tab === value
              ? 'bg-pqInner font-[600] text-pqText'
              : 'font-[500] text-pqMuted hover:text-pqText'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  ) : (
    <div className="text-[13px] font-[500] text-pqText">
      {type === 'video' ? t('video', 'Video') : t('images', 'Images')}
    </div>
  );

  // --- Insert-media picker (composer library sheet / design libraryOpen) ---
  // Idle: helper + Upload → filters → gallery → footer. No tall dashed strip
  // (that is /media only). DropFiles is scoped to the toolbar so a drag cover
  // never sits over the thumbs.
  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-[12px]">
      {fileInput}
      <DropFiles
        disabled={loading}
        noClick
        className="flex shrink-0 flex-wrap items-center gap-[10px]"
        onDrop={dragAndDrop}
      >
        <div className="min-w-0 flex-1 text-[12.5px] leading-[1.4] text-pqText">
          {t('select_or_upload_media', 'Select or upload media.')}
        </div>
        {/* Same order as /media, so the pair does not trade places between
            the page and this sheet. */}
        <ThirdPartyMediaLibrary size="picker" onImported={() => mutate()} />
        {brandUploadBtn('picker')}
      </DropFiles>

      {uppyBar}

          {/* Gallery fills the sheet under the filters. Desktop min-height is
              two full square rows so the second row is never half-cut. */}
      <div className="flex min-h-0 flex-1 flex-col gap-[8px]">
        <div className="flex shrink-0 flex-wrap items-center gap-[10px]">
          {filterTabs}
        </div>

        <div
          className="relative min-h-0 flex-1 overflow-y-auto p-[3px] pe-[4px] overscroll-contain scrollbar scrollbar-thumb-pqBorder scrollbar-track-pqInner"
          style={!touch ? { minHeight: MEDIA_LIBRARY_TWO_ROW_MIN } : undefined}
        >
          {isLoading && !data && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-x-[14px] gap-y-[12px]">
              {[...new Array(8)].map((_, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  <Skeleton
                    className={clsx(
                      MEDIA_LIBRARY_THUMB_ASPECT,
                      'rounded-[10px]'
                    )}
                  />
                  <div className="flex justify-between gap-[8px]">
                    <Skeleton className="h-[11px] w-[28%] rounded" />
                    <Skeleton className="h-[11px] w-[34%] rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!isLoading && visibleMedia.length === 0 && (
            <div className="flex flex-col items-center gap-[14px] py-[32px] text-center">
              <NoChannelsArt className="h-auto w-[160px]" />
              <div className="flex max-w-[280px] flex-col gap-[6px]">
                <div className="text-[15px] font-[600] text-pqText">
                  {t('nothing_here_yet', 'Nothing here yet')}
                </div>
                <div className="text-[13px] leading-[1.55] text-pqMuted text-balance">
                  {t(
                    'upload_images_or_video_or_drag',
                    'Upload images or video, or drag files straight onto this page. Up\u00a0to 1 GB per upload.'
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => uploaderRef.current?.click()}
                className="h-[34px] rounded-pqSm bg-pqBrand px-[14px] text-[13px] font-[600] text-pqOnBrand transition-colors hover:bg-pqBrandHover"
              >
                {t('upload_media', 'Upload media')}
              </button>
            </div>
          )}
          <div
            className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] items-start gap-x-[14px] gap-y-[12px]"
            data-pq="media-library-grid"
          >
            {visibleMedia.map((media) => {
              const alreadyOnPost = attachedIds.has(media.id);
              const selectionOrder = selected.findIndex(
                (z) => z.id === media.id
              );
              const isPicked = selectionOrder >= 0;
              const marked = isPicked || alreadyOnPost;
              const menuOpenForItem = menuMedia?.id === media.id;
              return (
                <div
                  key={media.id}
                  onClick={addRemoveSelected(media)}
                  className="group flex cursor-pointer flex-col gap-0.5"
                >
                  <div
                    className={clsx(
                      // Selection chrome: 2px brand border flush on the thumb
                      // edge — no ring-offset halo/gap between image and ring.
                      'relative w-full overflow-hidden rounded-[10px] bg-pqSettings border-2 transition-[border-color]',
                      MEDIA_LIBRARY_THUMB_ASPECT,
                      marked
                        ? 'border-pqBrand'
                        : 'border-pqBorder group-hover:border-pqBrand'
                    )}
                  >
                    <MediaThumb
                      media={media}
                      className={MEDIA_LIBRARY_THUMB_FILL}
                    />
                    {isVideoMedia(media) && !marked && (
                      <span className="absolute bottom-[7px] end-[7px] flex h-[19px] items-center gap-[4px] rounded-[5px] bg-black/72 px-[6px] text-[10px] font-[600] tabular-nums text-white">
                        {media.duration || t('video', 'Video')}
                      </span>
                    )}
                    {marked && (
                      <div
                        // Top-start order chip — clears the top-end ⋯ menu and
                        // the border-2 selection outline. Bare digit (no
                        // parentheses); already-attached stays a small check.
                        className={clsx(
                          'absolute top-[8px] start-[8px] z-[101] grid h-[22px] min-w-[22px] place-items-center rounded-[7px] bg-pqInner px-[6px] text-[11px] font-[700] leading-none tabular-nums text-pqBrand shadow-pqE2 shadow-[inset_0_0_0_1px_var(--border)]',
                          alreadyOnPost && !isPicked && 'text-pqMuted'
                        )}
                        title={
                          alreadyOnPost && !isPicked
                            ? t(
                                'media_already_on_post',
                                'This media is already on the post.'
                              )
                            : undefined
                        }
                      >
                        {alreadyOnPost && !isPicked ? (
                          <svg
                            viewBox="0 0 24 24"
                            width="12"
                            height="12"
                            fill="none"
                            aria-hidden
                          >
                            <path
                              d="M5.5 12.5 10 17l8.5-9"
                              stroke="currentColor"
                              strokeWidth="2.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : (
                          <span aria-hidden>{selectionOrder + 1}</span>
                        )}
                      </div>
                    )}
                    <div
                      className={clsx(
                        'absolute top-[6px] end-[6px] z-[100] transition-opacity',
                        menuOpenForItem
                          ? 'opacity-100'
                          : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                      )}
                    >
                      <button
                        type="button"
                        onClick={openMenu(media)}
                        title={t('more', 'More')}
                        className="grid size-[28px] place-items-center rounded-full bg-black/65 text-white backdrop-blur-[2px] hover:bg-black/80"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="16"
                          height="16"
                          fill="none"
                        >
                          <path
                            d="M12 6.5h.01M12 12h.01M12 17.5h.01"
                            stroke="currentColor"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between gap-[8px] px-[2px] text-[11px] leading-[1.35] tabular-nums text-pqMuted">
                    <span className="min-w-0 truncate uppercase">
                      {mediaFormatLabel(media)}
                    </span>
                    <span className="shrink-0">{mediaSizeLabel(media)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {(data?.pages || 0) > 1 && (
          <div className="shrink-0 pt-[4px]">
            <Pagination
              current={page}
              totalPages={data?.pages}
              setPage={setPage}
            />
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center justify-end gap-[8px] pt-[4px]">
        <button
          type="button"
          onClick={() => {
            closeModal();
            modals.closeCurrent();
          }}
          className="flex h-[44px] cursor-pointer items-center justify-center rounded-[10px] bg-transparent px-[18px] text-[14px] text-pqText shadow-[inset_0_0_0_1px_var(--border)]"
        >
          {t('cancel', 'Cancel')}
        </button>
        <button
          type="button"
          onClick={addMedia}
          disabled={selected.length === 0}
          className="flex h-[44px] cursor-pointer items-center justify-center gap-[8px] rounded-[10px] bg-pqBrand px-[20px] text-[14px] font-[600] text-pqOnBrand disabled:cursor-not-allowed disabled:opacity-80"
        >
          {t('add_selected_media', 'Add selected media')}
          {selected.length > 0 && (
            <span className="tabular-nums opacity-90">
              ({selected.length})
            </span>
          )}
        </button>
      </div>

      {menuMedia &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[400]"
              onClick={() => setMenuMedia(null)}
            />
            <div
              ref={menuFloatingRef}
              className="z-[401] flex w-[200px] flex-col gap-[2px] rounded-[12px] bg-pqPop p-[6px] shadow-pqE3 shadow-[inset_0_0_0_1px_var(--border)]"
            >
              <button
                type="button"
                className="rounded-[8px] px-[10px] py-[8px] text-start text-[13px] text-pqText hover:bg-pqHover"
                onClick={openLightbox(menuMedia)}
              >
                {t('preview', 'Preview')}
              </button>
              <button
                type="button"
                className="rounded-[8px] px-[10px] py-[8px] text-start text-[13px] text-pqText hover:bg-pqHover"
                onClick={() => {
                  downloadMedia(menuMedia)();
                  setMenuMedia(null);
                }}
              >
                {t('download', 'Download')}
              </button>
              <button
                type="button"
                className="rounded-[8px] px-[10px] py-[8px] text-start text-[13px] text-pqText hover:bg-pqHover"
                onClick={openAltText(menuMedia)}
              >
                {t('change_alt_text', 'Change alt text')}
              </button>
              <button
                type="button"
                className="rounded-[8px] px-[10px] py-[8px] text-start text-[13px] text-pqWarn hover:bg-pqHover"
                onClick={deleteImage(menuMedia)}
              >
                {t('delete', 'Delete')}
              </button>
            </div>
          </>,
          document.body
        )}

      {lightbox && (
        <MediaLightbox
          media={lightbox}
          onClose={() => setLightbox(null)}
          onDownload={downloadMedia(lightbox)}
            onDelete={() => deleteImage(lightbox)()}
        />
      )}
    </div>
  );
};
